const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");

const MAX_PER_TEAM = 10;

function formatTeam(players, team) {
  const members = players.filter((p) => p.team === team);
  if (!members.length) return "_Vacío_";
  return members.map((p) => `${p.ready ? "✅" : "⬜"} ${p.username}`).join("\n");
}

function buildLobbyPanel(lobbyId) {
  const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);

  if (!lobby || lobby.status === "finished") {
    const embed = new EmbedBuilder()
      .setTitle("🎯 Sala finalizada")
      .setColor(0x555555)
      .setDescription("Esta sala ya terminó. Usa `/panel` para crear una nueva.");
    return { embeds: [embed], components: [] };
  }

  const players = db
    .prepare(
      `SELECT lobby_players.*, players.username, players.avatar_url FROM lobby_players
       JOIN players ON players.user_id = lobby_players.user_id
       WHERE lobby_id = ? ORDER BY joined_at ASC`
    )
    .all(lobbyId);

  const teamACount = players.filter((p) => p.team === "A").length;
  const teamBCount = players.filter((p) => p.team === "B").length;
  const creator = players.find((p) => p.user_id === lobby.creator_id);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Sala de partida #${lobbyId}`)
    .setColor(0xff6b35)
    .addFields(
      { name: `🅰️ Equipo A (${teamACount}/${MAX_PER_TEAM})`, value: formatTeam(players, "A"), inline: true },
      { name: `🅱️ Equipo B (${teamBCount}/${MAX_PER_TEAM})`, value: formatTeam(players, "B"), inline: true }
    )
    .setFooter({ text: "Cuando todos estén ✅ Listo se crean los canales de voz" })
    .setTimestamp();

  if (creator) {
    embed.setAuthor({ name: `Sala creada por ${creator.username}`, iconURL: creator.avatar_url ?? undefined });
  }

  if (lobby.match_code) {
    embed.addFields({
      name: "🔑 Código de matchmaking privado de CS2",
      value: `\`\`\`${lobby.match_code}\`\`\`\nEn CS2: Jugar → Matchmaking Privado → Introducir código`
    });
  } else {
    embed.setDescription("Aún no hay código de matchmaking. El primero en unirse lo va a pedir.");
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lobby_join_a:${lobbyId}`).setLabel("Unirse Equipo A").setStyle(ButtonStyle.Primary).setDisabled(teamACount >= MAX_PER_TEAM),
    new ButtonBuilder().setCustomId(`lobby_join_b:${lobbyId}`).setLabel("Unirse Equipo B").setStyle(ButtonStyle.Primary).setDisabled(teamBCount >= MAX_PER_TEAM),
    new ButtonBuilder().setCustomId(`lobby_leave:${lobbyId}`).setLabel("Salir").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lobby_ready:${lobbyId}`).setLabel("Listo / No listo").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId(`lobby_finalize:${lobbyId}`).setLabel("Finalizar sala").setStyle(ButtonStyle.Secondary).setEmoji("🏁")
  );

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = { buildLobbyPanel, MAX_PER_TEAM };
