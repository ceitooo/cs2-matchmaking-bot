const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreatePlayer } = require("../db/database");
const { fetchCs2Stats, fetchSteamProfile, fetchCs2PlaytimeMinutes, evaluateSmurfRisk } = require("../utils/steamStats");
const { fetchFaceitStats } = require("../utils/faceitStats");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("steam-stats")
    .setDescription("Muestra tus estadísticas reales de CS2 vía Steam")
    .addUserOption((opt) => opt.setName("jugador").setDescription("Ver stats de otro jugador").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("jugador") ?? interaction.user;
    const player = getOrCreatePlayer(target.id, target.username);

    if (!player.steam_id) {
      return interaction.reply({
        content: `${target.id === interaction.user.id ? "No tienes" : `${target.username} no tiene`} una cuenta de Steam vinculada. Usa \`/vincular-steam\`.`,
        flags: 64
      });
    }

    const [cs2Stats, profile, faceit, playtimeMinutes] = await Promise.all([
      fetchCs2Stats(player.steam_id),
      fetchSteamProfile(player.steam_id),
      fetchFaceitStats(player.steam_id),
      fetchCs2PlaytimeMinutes(player.steam_id)
    ]);

    if (!cs2Stats) {
      return interaction.reply({
        content: "No se pudieron leer las stats de CS2. El perfil de Steam podría ser privado.",
        flags: 64
      });
    }

    const kd = cs2Stats.deaths > 0 ? (cs2Stats.kills / cs2Stats.deaths).toFixed(2) : cs2Stats.kills.toFixed(2);
    const hsPercent = cs2Stats.kills > 0 ? ((cs2Stats.headshots / cs2Stats.kills) * 100).toFixed(1) : "0.0";

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Stats de CS2 — ${profile?.personaname ?? target.username}`)
      .setColor(0x1b2838)
      .setThumbnail(profile?.avatarfull ?? target.displayAvatarURL())
      .setURL(`https://steamcommunity.com/profiles/${player.steam_id}`)
      .addFields(
        { name: "Kills", value: `${cs2Stats.kills}`, inline: true },
        { name: "Muertes", value: `${cs2Stats.deaths}`, inline: true },
        { name: "K/D", value: `${kd}`, inline: true },
        { name: "Victorias", value: `${cs2Stats.wins}`, inline: true },
        { name: "MVPs", value: `${cs2Stats.mvps}`, inline: true },
        { name: "Headshot %", value: `${hsPercent}%`, inline: true }
      )
      .setFooter({ text: "Datos públicos de Steam Web API y FACEIT" });

    if (faceit) {
      embed.addFields({
        name: "FACEIT",
        value: `Nivel: ${faceit.level} · ELO: ${faceit.elo} · Región: ${faceit.region}${faceit.faceitUrl ? ` · [Perfil](${faceit.faceitUrl})` : ""}`
      });
    } else {
      embed.addFields({ name: "FACEIT", value: "No se encontró cuenta de FACEIT vinculada a este Steam." });
    }

    embed.addFields({
      name: "Más stats (enlaces externos)",
      value:
        `[Leetify](https://leetify.com/app/profile/${player.steam_id}) — Aim Rating, K/D, Win Rate\n` +
        `[CS2Tracker](https://cs2tracker.gg/stats/${player.steam_id}) — Premier Rating, detección de cheating\n` +
        `[CSTracker](https://cstracker.gg/players/${player.steam_id}) — historial y stats generales`
    });

    const smurfFlags = evaluateSmurfRisk(profile, playtimeMinutes);
    if (smurfFlags.length) {
      embed.addFields({ name: "⚠️ Señales de cuenta nueva", value: smurfFlags.join(", ") });
    }

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
