const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const { db, getOrCreatePlayer, claimKey, getGuildSettings, getAvailableResources, addSubscription } = require("../db/database");
const { buildLobbyPanel, MAX_PER_TEAM } = require("../utils/panelBuilder");
const { checkAllReadyAndSyncChannels, finalizeLobby, scheduleLobbyTimers, clearLobbyTimers } = require("../utils/matchmaking");
const { joinQuickQueue, leaveQuickQueue } = require("../utils/quickQueue");
const { getProducts } = require("../utils/shopBuilder");
const { createProductTicket, closeTicket, pingRoleIds, canPing, registerPing } = require("../utils/tickets");
const { isStaffOrCeito } = require("../utils/permissions");

const STEAM_BYPASS_ROLE_ID = "1339092538413551686"; // rol "ceito"
const LOW_STOCK_THRESHOLD = 2;

async function warnIfLowStock(client, guildId, resource) {
  const settings = getGuildSettings(guildId);
  if (!settings.stock_keys_channel_id) return;

  const stock = getAvailableResources(guildId).find((r) => r.resource === resource)?.stock ?? 0;
  if (stock > LOW_STOCK_THRESHOLD) return;

  const channel = await client.channels.fetch(settings.stock_keys_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel
    .send(
      stock === 0
        ? `🚨 **${resource}** se quedó sin stock. Cargá más keys acá.`
        : `⚠️ Stock bajo de **${resource}**: quedan **${stock}**.`
    )
    .catch(() => {});
}

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

async function dmMatchCode(interaction, lobby) {
  if (!lobby.match_code) return;
  await interaction.user
    .send(`🔑 Código de matchmaking privado para la sala #${lobby.id}:\n\`\`\`${lobby.match_code}\`\`\``)
    .catch(() => {});
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
      return;
    }

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

      getOrCreatePlayer(interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
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
      db.prepare("UPDATE players SET lobbies_created = lobbies_created + 1 WHERE user_id = ?").run(interaction.user.id);

      await interaction.reply({ content: "✅ Código guardado, te uniste a la sala como creador. Te lo mandé también por DM.", flags: 64 });

      const updatedLobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
      await dmMatchCode(interaction, updatedLobby);

      scheduleLobbyTimers(interaction.guild, lobbyId, buildLobbyPanel);

      const channel = await interaction.client.channels.fetch(lobby.channel_id).catch(() => null);
      if (channel && lobby.message_id) {
        const message = await channel.messages.fetch(lobby.message_id).catch(() => null);
        if (message) await message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      }
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("lobby_kick:")) {
      const { lobbyId } = parseId(interaction.customId);
      const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
      if (!lobby || lobby.status === "finished") {
        return interaction.reply({ content: "Esta sala ya no existe.", flags: 64 });
      }

      if (interaction.user.id !== lobby.creator_id && !interaction.memberPermissions?.has("ManageGuild")) {
        return interaction.reply({ content: "Solo quien creó la sala (o un admin) puede expulsar jugadores.", flags: 64 });
      }

      const targetId = interaction.values[0];
      if (targetId === lobby.creator_id) {
        return interaction.reply({ content: "No puedes expulsarte a ti mismo. Usa \"Finalizar sala\" si quieres cerrarla.", flags: 64 });
      }

      db.prepare("DELETE FROM lobby_players WHERE lobby_id = ? AND user_id = ?").run(lobbyId, targetId);
      await interaction.client.users.send(targetId, `Fuiste expulsado de la sala #${lobbyId}.`).catch(() => {});

      await refreshPanel(interaction, lobbyId);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("invite_reward:")) {
      const [, guildId] = interaction.customId.split(":");
      const resource = interaction.values[0];

      const key = claimKey(guildId, resource, interaction.user.id);
      if (!key) {
        return interaction.reply({ content: `❌ Se quedó sin stock justo ahora. Avisale a un admin para que cargue más de **${resource}**.`, flags: 64 });
      }

      await interaction.reply({ content: `🔑 Acá tenés tu key de **${resource}** (1 día):\n\`\`\`${key.key_value}\`\`\``, flags: 64 });
      await warnIfLowStock(interaction.client, guildId, resource);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "shop_buy_select") {
      const productId = Number(interaction.values[0]);
      const product = db.prepare("SELECT * FROM shop_products WHERE id = ? AND guild_id = ?").get(productId, interaction.guildId);
      if (!product) {
        return interaction.reply({ content: "Ese producto ya no está disponible.", flags: 64 });
      }

      await interaction.deferReply({ flags: 64 });
      const channel = await createProductTicket(interaction.guild, interaction.member, product).catch(() => null);
      if (!channel) {
        return interaction.editReply({ content: "No pude crear el ticket. Avisale a un staff." });
      }
      return interaction.editReply({ content: `✅ Ticket creado: ${channel}` });
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket_renew:")) {
      if (!isStaffOrCeito(interaction)) {
        return interaction.reply({ content: "Solo el staff o ceito pueden programar renovaciones.", flags: 64 });
      }

      const [, channelId, targetUserId] = interaction.customId.split(":");
      const modal = new ModalBuilder()
        .setCustomId(`ticket_renew_modal:${channelId}:${targetUserId}`)
        .setTitle("Programar renovación")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("producto").setLabel("Producto (ej: Netflix)").setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("cantidad").setLabel("Cantidad (número)").setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("unidad")
              .setLabel("Unidad: dias, meses o anios")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_renew_modal:")) {
      const [, , targetUserId] = interaction.customId.split(":");
      const producto = interaction.fields.getTextInputValue("producto").trim();
      const cantidad = Number(interaction.fields.getTextInputValue("cantidad").trim());
      const unidadRaw = interaction.fields.getTextInputValue("unidad").trim().toLowerCase();

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return interaction.reply({ content: "❌ La cantidad tiene que ser un número mayor a 0.", flags: 64 });
      }
      if (!["dias", "meses", "anios"].includes(unidadRaw)) {
        return interaction.reply({ content: "❌ La unidad tiene que ser `dias`, `meses` o `anios`.", flags: 64 });
      }

      const DAY_MS = 24 * 60 * 60 * 1000;
      const diasEquivalentes = unidadRaw === "anios" ? cantidad * 365 : unidadRaw === "meses" ? cantidad * 30 : cantidad;
      const expiresAt = Date.now() + diasEquivalentes * DAY_MS;

      const created = addSubscription(interaction.guild.id, targetUserId, producto, expiresAt, interaction.user.id);

      return interaction.reply({
        content: `✅ Recordatorio #${created.id} programado para <@${targetUserId}> — **${producto}**, vence <t:${Math.floor(expiresAt / 1000)}:R>.`
      });
    }

    if (interaction.isButton() && interaction.customId === "test_key_dm") {
      const dmSent = await interaction.user
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎉 ¡Felicidades, conseguiste 5 invitaciones!")
              .setColor(0x2ecc71)
              .setDescription("Elegí 1 día de uno de los siguientes recursos y te mando la key acá mismo:")
          ]
        })
        .then(() =>
          interaction.user.send({ content: "🔑 Acá tenés tu key de **Ceitus** (1 día):\n```CEITUS-TEST-TEST-TEST-TEST```\n⚠️ Esta es una key de prueba, no funciona de verdad." })
        )
        .catch(() => null);

      if (!dmSent) {
        return interaction.reply({ content: "❌ No pude enviarte el DM (revisá que tengas los mensajes directos abiertos).", flags: 64 });
      }
      return interaction.reply({ content: "✅ Te mandé la simulación por DM.", flags: 64 });
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket_ping:")) {
      const status = canPing(interaction.channelId);
      if (!status.ok) {
        return interaction.reply({ content: `⏳ Esperá ${status.remainingSeconds}s antes de volver a avisar al staff.`, flags: 64 });
      }

      registerPing(interaction.channelId);
      const mentions = pingRoleIds(interaction.guild).map((id) => `<@&${id}>`).join(" ");
      return interaction.reply({ content: `🔔 ${mentions} — ${interaction.user} necesita atención en este ticket.` });
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket_close:")) {
      if (!isStaffOrCeito(interaction)) {
        return interaction.reply({ content: "Solo el staff o ceito pueden cerrar tickets.", flags: 64 });
      }

      await interaction.reply({ content: "🔒 Cerrando ticket y guardando el registro..." });
      await closeTicket(interaction.channel, interaction.user);
      await interaction.channel.delete().catch(() => {});
      return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("qq_join:")) {
      const [, queueId] = interaction.customId.split(":");
      return joinQuickQueue(interaction, Number(queueId));
    }
    if (interaction.customId.startsWith("qq_leave:")) {
      const [, queueId] = interaction.customId.split(":");
      return leaveQuickQueue(interaction, Number(queueId));
    }

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
      await dmMatchCode(interaction, lobby);
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
      clearLobbyTimers(lobbyId);
      await finalizeLobby(interaction.guild, lobbyId);
      await interaction.message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      return;
    }
  }
};
