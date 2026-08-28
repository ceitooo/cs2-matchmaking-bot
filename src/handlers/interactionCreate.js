const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { db, getOrCreatePlayer } = require("../db/database");
const { buildLobbyPanel, MAX_PER_TEAM } = require("../utils/panelBuilder");
const { checkAllReadyAndSyncChannels, finalizeLobby } = require("../utils/matchmaking");

const STEAM_BYPASS_ROLE_ID = "1339092538413551686"; // rol "ceito"

function parseId(customId) {
  const [action, lobbyId] = customId.split(":");
  return { action, lobbyId: Number(lobbyId) };
}

async function refreshPanel(interaction, lobbyId) {
  const payload = buildLobbyPanel(lobbyId);
  if (interaction.deferred || interaction.replied) {
    await interaction.message.edit(payload).catch(() => {});
  } else {
    await interaction.update(payload).catch(() => {});
  }
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

    if (interaction.isModalSubmit() && interaction.customId.startsWith("lobby_code_modal:")) {
      const { lobbyId } = parseId(interaction.customId);
      const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
      if (!lobby || lobby.status === "finished") {
        return interaction.reply({ content: "Esta sala ya no existe.", flags: 64 });
      }

      const player = getOrCreatePlayer(interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
      const alreadyIn = db.prepare("SELECT 1 FROM lobby_players WHERE lobby_id = ? AND user_id = ?").get(lobbyId, interaction.user.id);
      if (alreadyIn) {
        return interaction.reply({ content: "Ya estás en esta sala.", flags: 64 });
      }

      const code = interaction.fields.getTextInputValue("code").trim();
      const team = interaction.fields.getTextInputValue("team_hint") || "A";
      const teamAName = interaction.fields.getTextInputValue("team_a_name").trim() || "Equipo A";
      const teamBName = interaction.fields.getTextInputValue("team_b_name").trim() || "Equipo B";

      db.prepare("UPDATE lobbies SET match_code = ?, creator_id = ?, team_a_name = ?, team_b_name = ? WHERE id = ?").run(
        code,
        interaction.user.id,
        teamAName,
        teamBName,
        lobbyId
      );
      db.prepare("INSERT INTO lobby_players (lobby_id, user_id, team, ready, joined_at) VALUES (?, ?, ?, 0, ?)").run(
        lobbyId,
        interaction.user.id,
        team === "B" ? "B" : "A",
        Date.now()
      );

      await interaction.reply({ content: "✅ Código guardado, te uniste a la sala como creador.", flags: 64 });

      const channel = await interaction.client.channels.fetch(lobby.channel_id).catch(() => null);
      if (channel && lobby.message_id) {
        const message = await channel.messages.fetch(lobby.message_id).catch(() => null);
        if (message) await message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      }
      return;
    }

    if (!interaction.isButton()) return;

    const { action, lobbyId } = parseId(interaction.customId);
    if (!action.startsWith("lobby_")) return;

    const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
    if (!lobby || lobby.status === "finished") {
      return interaction.reply({ content: "Esta sala ya no existe. Usa `/panel` para crear una nueva.", flags: 64 });
    }

    if (action === "lobby_join_a" || action === "lobby_join_b") {
      const team = action === "lobby_join_a" ? "A" : "B";
      const player = getOrCreatePlayer(interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
      const bypassSteam = interaction.member?.roles?.cache?.has(STEAM_BYPASS_ROLE_ID);

      if (!player.steam_id && !bypassSteam) {
        return interaction.reply({ content: "Debes vincular tu cuenta de Steam antes de unirte. Usa `/vincular-steam`.", flags: 64 });
      }

      const already = db.prepare("SELECT 1 FROM lobby_players WHERE lobby_id = ? AND user_id = ?").get(lobbyId, interaction.user.id);
      if (already) {
        return interaction.reply({ content: "Ya estás en esta sala.", flags: 64 });
      }

      const teamCount = db.prepare("SELECT COUNT(*) as c FROM lobby_players WHERE lobby_id = ? AND team = ?").get(lobbyId, team).c;
      if (teamCount >= MAX_PER_TEAM) {
        return interaction.reply({ content: `El Equipo ${team} ya está lleno (máximo ${MAX_PER_TEAM}).`, flags: 64 });
      }

      const totalPlayers = db.prepare("SELECT COUNT(*) as c FROM lobby_players WHERE lobby_id = ?").get(lobbyId).c;

      if (totalPlayers === 0) {
        const modal = new ModalBuilder().setCustomId(`lobby_code_modal:${lobbyId}`).setTitle("Código de matchmaking privado");

        const codeInput = new TextInputBuilder()
          .setCustomId("code")
          .setLabel("Código de CS2 (Jugar → Matchmaking Privado)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("XXXXX-XXXXX-XXXXX-XXXX")
          .setRequired(true)
          .setMaxLength(40);

        const teamInput = new TextInputBuilder()
          .setCustomId("team_hint")
          .setLabel(`Tu equipo (A o B) — elegiste: ${team}`)
          .setStyle(TextInputStyle.Short)
          .setValue(team)
          .setRequired(true)
          .setMaxLength(1);

        const teamAName = new TextInputBuilder()
          .setCustomId("team_a_name")
          .setLabel("Nombre del Equipo A")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Equipo A")
          .setRequired(false)
          .setMaxLength(50);

        const teamBName = new TextInputBuilder()
          .setCustomId("team_b_name")
          .setLabel("Nombre del Equipo B")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Equipo B")
          .setRequired(false)
          .setMaxLength(50);

        modal.addComponents(
          new ActionRowBuilder().addComponents(codeInput),
          new ActionRowBuilder().addComponents(teamInput),
          new ActionRowBuilder().addComponents(teamAName),
          new ActionRowBuilder().addComponents(teamBName)
        );
        return interaction.showModal(modal);
      }

      db.prepare("INSERT INTO lobby_players (lobby_id, user_id, team, ready, joined_at) VALUES (?, ?, ?, 0, ?)").run(
        lobbyId,
        interaction.user.id,
        team,
        Date.now()
      );

      await refreshPanel(interaction, lobbyId);
      return;
    }

    if (action === "lobby_leave") {
      const removed = db.prepare("DELETE FROM lobby_players WHERE lobby_id = ? AND user_id = ?").run(lobbyId, interaction.user.id);
      if (removed.changes === 0) {
        return interaction.reply({ content: "No estabas en esta sala.", flags: 64 });
      }
      await refreshPanel(interaction, lobbyId);
      return;
    }

    if (action === "lobby_ready") {
      const entry = db.prepare("SELECT * FROM lobby_players WHERE lobby_id = ? AND user_id = ?").get(lobbyId, interaction.user.id);
      if (!entry) {
        return interaction.reply({ content: "Primero únete a un equipo.", flags: 64 });
      }

      db.prepare("UPDATE lobby_players SET ready = ? WHERE lobby_id = ? AND user_id = ?").run(entry.ready ? 0 : 1, lobbyId, interaction.user.id);

      await interaction.update(buildLobbyPanel(lobbyId));

      const guild = interaction.guild;
      await checkAllReadyAndSyncChannels(guild, lobbyId);
      await interaction.message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      return;
    }

    if (action === "lobby_finalize") {
      if (interaction.user.id !== lobby.creator_id && !interaction.memberPermissions?.has("ManageGuild")) {
        return interaction.reply({ content: "Solo quien creó la sala (o un admin) puede finalizarla.", flags: 64 });
      }

      await interaction.deferUpdate().catch(() => {});
      await finalizeLobby(interaction.guild, lobbyId);
      await interaction.message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      return;
    }
  }
};
