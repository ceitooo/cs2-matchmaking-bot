const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");

function buildQueuePanel() {
  const queued = db
    .prepare(
      `SELECT players.username, players.elo FROM queue
       JOIN players ON players.user_id = queue.user_id
       ORDER BY queue.joined_at ASC`
    )
    .all();

  const meta = db.prepare("SELECT match_code FROM queue_meta WHERE id = 1").get();

  const embed = new EmbedBuilder()
    .setTitle("🎯 Matchmaking CS2")
    .setColor(0xff6b35)
    .setDescription(
      queued.length
        ? queued.map((p, i) => `**${i + 1}.** ${p.username} — \`${p.elo} ELO\``).join("\n")
        : "Cola vacía. ¡Sé el primero en unirte!"
    )
    .setFooter({ text: `${queued.length}/10 jugadores en cola` })
    .setTimestamp();

  if (meta?.match_code) {
    embed.addFields({
      name: "🔑 Código de matchmaking privado de CS2",
      value: `\`\`\`${meta.match_code}\`\`\`\nÚsalo en CS2: Jugar → Matchmaking Privado → Introducir código`
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("queue_join").setLabel("Unirse a la cola").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId("queue_leave").setLabel("Salir de la cola").setStyle(ButtonStyle.Danger).setEmoji("❌"),
    new ButtonBuilder().setCustomId("queue_stats").setLabel("Mis stats").setStyle(ButtonStyle.Secondary).setEmoji("📊")
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildQueuePanel };
