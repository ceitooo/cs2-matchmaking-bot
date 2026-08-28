const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { db, getOrCreatePlayer } = require("../db/database");
const { buildQueuePanel } = require("../utils/panelBuilder");
const { tryStartMatch } = require("../utils/matchmaking");

function joinQueue(userId) {
  db.prepare("INSERT INTO queue (user_id, joined_at) VALUES (?, ?)").run(userId, Date.now());
  db.prepare("UPDATE players SET in_queue = 1 WHERE user_id = ?").run(userId);
}

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

    if (interaction.isModalSubmit() && interaction.customId === "queue_code_modal") {
      const player = getOrCreatePlayer(interaction.user.id, interaction.user.username);

      const stillEmpty = !db.prepare("SELECT 1 FROM queue LIMIT 1").get();
      if (!stillEmpty) {
        return interaction.reply({ content: "Alguien más ya inició la cola mientras escribías el código. Únete normalmente.", flags: 64 });
      }
      if (player.in_match) {
        return interaction.reply({ content: "Ya estás en una partida en curso.", flags: 64 });
      }

      const code = interaction.fields.getTextInputValue("code").trim();

      db.prepare("INSERT INTO queue_meta (id, match_code, created_by) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET match_code = excluded.match_code, created_by = excluded.created_by")
        .run(code, interaction.user.id);

      joinQueue(interaction.user.id);

      await interaction.reply({ content: "✅ Código guardado y te uniste a la cola.", flags: 64 });

      const channel = await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
      if (channel) {
        const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
        const panelMessage = messages?.find((m) => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (panelMessage) await panelMessage.edit(buildQueuePanel()).catch(() => {});
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

      const queueEmpty = !db.prepare("SELECT 1 FROM queue LIMIT 1").get();

      if (queueEmpty) {
        const modal = new ModalBuilder().setCustomId("queue_code_modal").setTitle("Código de matchmaking privado");

        const input = new TextInputBuilder()
          .setCustomId("code")
          .setLabel("Código de CS2 (Jugar → Matchmaking Privado)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("XXXXX-XXXXX-XXXXX-XXXX")
          .setRequired(true)
          .setMaxLength(40);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      joinQueue(interaction.user.id);

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

      const queueNowEmpty = !db.prepare("SELECT 1 FROM queue LIMIT 1").get();
      if (queueNowEmpty) {
        db.prepare("DELETE FROM queue_meta WHERE id = 1").run();
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
