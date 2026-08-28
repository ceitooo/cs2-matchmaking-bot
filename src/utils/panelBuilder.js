const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");

const MAX_PER_TEAM = 5;
const TEAM_A_COLOR = 0x3498db;
const TEAM_B_COLOR = 0xe74c3c;

function buildLobbyPanel(lobbyId) {
  const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);

  if (!lobby || lobby.status === "finished") {
    return {
      content: "🎯 **Sala finalizada.** Usa `/panel` para crear una nueva.",
      embeds: [],
      components: []
    };
  }

  const players = db
    .prepare(
      `SELECT lobby_players.*, players.username, players.avatar_url FROM lobby_players
       JOIN players ON players.user_id = lobby_players.user_id
       WHERE lobby_id = ? ORDER BY joined_at ASC`
    )
    .all(lobbyId);

  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");
  const creator = players.find((p) => p.user_id === lobby.creator_id);

  const lines = [`## 🎯 Sala de partida #${lobbyId}`];
  if (creator) lines.push(`Creada por **${creator.username}**`);
  lines.push("", `**🅰️ ${lobby.team_a_name} (${teamA.length}/${MAX_PER_TEAM})** · **🅱️ ${lobby.team_b_name} (${teamB.length}/${MAX_PER_TEAM})**`);

  if (lobby.match_code) {
    lines.push("", "🔑 **Código de matchmaking privado**", `\`\`\`${lobby.match_code}\`\`\``, "En CS2: Jugar → Matchmaking Privado → Introducir código");
  } else {
    lines.push("", "_Aún no hay código de matchmaking. El primero en unirse lo va a pedir._");
  }

  lines.push("", "Cuando todos estén ✅ Listo se crean los canales de voz.");

  const playerEmbeds = [...teamA, ...teamB].slice(0, 10).map((p) =>
    new EmbedBuilder()
      .setAuthor({
        name: `${p.ready ? "✅" : "⬜"} ${p.username} — ${p.team === "A" ? lobby.team_a_name : lobby.team_b_name}`,
        iconURL: p.avatar_url ?? undefined
      })
      .setColor(p.team === "A" ? TEAM_A_COLOR : TEAM_B_COLOR)
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lobby_join_a:${lobbyId}`).setLabel(`Unirse ${lobby.team_a_name}`).setStyle(ButtonStyle.Primary).setDisabled(teamA.length >= MAX_PER_TEAM),
    new ButtonBuilder().setCustomId(`lobby_join_b:${lobbyId}`).setLabel(`Unirse ${lobby.team_b_name}`).setStyle(ButtonStyle.Primary).setDisabled(teamB.length >= MAX_PER_TEAM),
    new ButtonBuilder().setCustomId(`lobby_leave:${lobbyId}`).setLabel("Salir").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lobby_ready:${lobbyId}`).setLabel("Listo / No listo").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId(`lobby_finalize:${lobbyId}`).setLabel("Finalizar sala").setStyle(ButtonStyle.Secondary).setEmoji("🏁")
  );

  return {
    content: lines.join("\n"),
    embeds: playerEmbeds,
    components: [row1, row2]
  };
}

module.exports = { buildLobbyPanel, MAX_PER_TEAM };
