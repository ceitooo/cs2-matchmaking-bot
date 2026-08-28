const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { db } = require("../db/database");
const { applyMatchResult } = require("../utils/elo");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resultado")
    .setDescription("Confirma el ganador de una partida (solo admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((opt) => opt.setName("partida_id").setDescription("ID de la partida").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName("ganador")
        .setDescription("Equipo ganador")
        .setRequired(true)
        .addChoices({ name: "Equipo A", value: "A" }, { name: "Equipo B", value: "B" })
    ),

  async execute(interaction) {
    const matchId = interaction.options.getInteger("partida_id");
    const winner = interaction.options.getString("ganador");

    const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId);
    if (!match) return interaction.reply({ content: "No existe esa partida.", flags: 64 });
    if (match.status === "finished") return interaction.reply({ content: "Esa partida ya fue resuelta.", flags: 64 });

    const teamAIds = JSON.parse(match.team_a);
    const teamBIds = JSON.parse(match.team_b);

    const getPlayer = db.prepare("SELECT * FROM players WHERE user_id = ?");
    const teamA = teamAIds.map((id) => getPlayer.get(id));
    const teamB = teamBIds.map((id) => getPlayer.get(id));

    const teamAAvg = Math.round(teamA.reduce((s, p) => s + p.elo, 0) / teamA.length);
    const teamBAvg = Math.round(teamB.reduce((s, p) => s + p.elo, 0) / teamB.length);

    const { deltaA, deltaB } = applyMatchResult(teamAAvg, teamBAvg, winner === "A");

    const updatePlayer = db.prepare("UPDATE players SET elo = elo + ?, wins = wins + ?, losses = losses + ?, in_match = 0 WHERE user_id = ?");
    for (const p of teamA) updatePlayer.run(deltaA, winner === "A" ? 1 : 0, winner === "A" ? 0 : 1, p.user_id);
    for (const p of teamB) updatePlayer.run(deltaB, winner === "B" ? 1 : 0, winner === "B" ? 0 : 1, p.user_id);

    db.prepare("UPDATE matches SET status = 'finished', winner = ? WHERE id = ?").run(winner, matchId);

    const embed = new EmbedBuilder()
      .setTitle(`✅ Partida #${matchId} resuelta`)
      .setColor(0x2ecc71)
      .setDescription(`Ganó el **Equipo ${winner}**`)
      .addFields(
        { name: "Equipo A", value: `${winner === "A" ? "+" : ""}${deltaA} ELO`, inline: true },
        { name: "Equipo B", value: `${winner === "B" ? "+" : ""}${deltaB} ELO`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });

    try {
      const guild = interaction.guild;
      const category = guild.channels.cache.get(match.text_channel)?.parent;
      const toDelete = [match.team_a_channel, match.team_b_channel, match.text_channel];
      for (const id of toDelete) {
        const ch = guild.channels.cache.get(id);
        if (ch) await ch.delete().catch(() => {});
      }
      if (category) await category.delete().catch(() => {});
    } catch {
      // canales ya podrían haber sido borrados manualmente
    }
  }
};
