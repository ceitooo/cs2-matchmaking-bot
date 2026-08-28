const { SlashCommandBuilder } = require("discord.js");
const { db } = require("../db/database");
const { buildLobbyPanel } = require("../utils/panelBuilder");

const MAX_OPEN_LOBBIES_PER_USER = 2;

module.exports = {
  data: new SlashCommandBuilder().setName("panel").setDescription("Crea una nueva sala de partida en este canal"),

  async execute(interaction) {
    const openCount = db
      .prepare("SELECT COUNT(*) as c FROM lobbies WHERE opened_by = ? AND status = 'open'")
      .get(interaction.user.id).c;

    if (openCount >= MAX_OPEN_LOBBIES_PER_USER) {
      return interaction.reply({
        content: `Ya tienes ${MAX_OPEN_LOBBIES_PER_USER} salas abiertas. Finaliza alguna antes de crear otra.`,
        flags: 64
      });
    }

    const result = db
      .prepare("INSERT INTO lobbies (guild_id, channel_id, opened_by, status, created_at) VALUES (?, ?, ?, 'open', ?)")
      .run(interaction.guildId, interaction.channelId, interaction.user.id, Date.now());

    const lobbyId = result.lastInsertRowid;

    await interaction.reply(buildLobbyPanel(lobbyId));

    const message = await interaction.fetchReply();
    db.prepare("UPDATE lobbies SET message_id = ? WHERE id = ?").run(message.id, lobbyId);
  }
};
