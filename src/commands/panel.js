const { SlashCommandBuilder } = require("discord.js");
const { db } = require("../db/database");
const { buildLobbyPanel } = require("../utils/panelBuilder");

module.exports = {
  data: new SlashCommandBuilder().setName("panel").setDescription("Crea una nueva sala de partida en este canal"),

  async execute(interaction) {
    const result = db
      .prepare("INSERT INTO lobbies (guild_id, channel_id, status, created_at) VALUES (?, ?, 'open', ?)")
      .run(interaction.guildId, interaction.channelId, Date.now());

    const lobbyId = result.lastInsertRowid;

    await interaction.reply(buildLobbyPanel(lobbyId));

    const message = await interaction.fetchReply();
    db.prepare("UPDATE lobbies SET message_id = ? WHERE id = ?").run(message.id, lobbyId);
  }
};
