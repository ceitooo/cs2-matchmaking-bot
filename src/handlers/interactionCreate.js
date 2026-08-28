const { EmbedBuilder } = require("discord.js");
const { db, getOrCreatePlayer } = require("../db/database");
const { buildQueuePanel } = require("../utils/panelBuilder");
const { tryStartMatch } = require("../utils/matchmaking");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const payload = { content: "Ocurrió un error al ejecutar el comando.", flags: 64 };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === "queue_join") {
      const player = getOrCreatePlayer(interaction.user.id, interaction.user.username);

      if (!player.steam_id) {
        return interaction.reply({ content: "Debes vincular tu cuenta de Steam antes de jugar. Usa `/vincular-steam`.", flags: 64 });
      }
      if (player.in_match) {
        return interaction.reply({ content: "Ya estás en una partida en curso.", flags: 64 });
      }

      const already = db.prepare("SELECT 1 FROM queue WHERE user_id = ?").get(interaction.user.id);
      if (already) {
        return interaction.reply({ content: "Ya estás en la cola.", flags: 64 });
      }

      db.prepare("INSERT INTO queue (user_id, joined_at) VALUES (?, ?)").run(interaction.user.id, Date.now());
      db.prepare("UPDATE players SET in_queue = 1 WHERE user_id = ?").run(interaction.user.id);

      await interaction.update(buildQueuePanel());

      const matchId = await tryStartMatch(interaction.guild, interaction.channel);
      if (matchId) {
        await interaction.message.edit(buildQueuePanel()).catch(() => {});
      }
      return;
    }

    if (interaction.customId === "queue_leave") {
      const removed = db.prepare("DELETE FROM queue WHERE user_id = ?").run(interaction.user.id);
      db.prepare("UPDATE players SET in_queue = 0 WHERE user_id = ?").run(interaction.user.id);

      if (removed.changes === 0) {
        return interaction.reply({ content: "No estabas en la cola.", flags: 64 });
      }

      await interaction.update(buildQueuePanel());
      return;
    }

    if (interaction.customId === "queue_stats") {
      const player = getOrCreatePlayer(interaction.user.id, interaction.user.username);
      const total = player.wins + player.losses;
      const winrate = total > 0 ? ((player.wins / total) * 100).toFixed(1) : "0.0";

      const embed = new EmbedBuilder()
        .setTitle(`📊 Tus stats`)
        .setColor(0x3498db)
        .addFields(
          { name: "ELO", value: `${player.elo}`, inline: true },
          { name: "Victorias", value: `${player.wins}`, inline: true },
          { name: "Derrotas", value: `${player.losses}`, inline: true },
          { name: "Winrate", value: `${winrate}%`, inline: true },
          { name: "Steam vinculado", value: player.steam_id ? "Sí ✅" : "No — usa /vincular-steam", inline: true }
        );

      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
