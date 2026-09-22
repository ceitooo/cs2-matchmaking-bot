const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const {
  db,
  getOrCreatePlayer,
  claimKey,
  getGuildSettings,
  getAvailableResources,
  addSubscription,
  toggleGiveawayEntry,
  countGiveawayEntries,
  getGiveawayById,
  getGiveawayEntries
} = require("../db/database");
const { buildLobbyPanel, MAX_PER_TEAM } = require("../utils/panelBuilder");
const { checkAllReadyAndSyncChannels, finalizeLobby, scheduleLobbyTimers, clearLobbyTimers } = require("../utils/matchmaking");
const { joinQuickQueue, leaveQuickQueue } = require("../utils/quickQueue");
const { getProducts } = require("../utils/shopBuilder");
const { createAllianceTicket, createProductTicket, closeTicket, pingRoleIds, canPing, registerPing } = require("../utils/tickets");
const { isStaffOrCeito, isCs2CommandBlockedInGuild, isMemberAuthorizedInSpecialGuild } = require("../utils/permissions");
const { pickWinners } = require("../utils/giveawayChecker");
const { refreshStockPanel } = require("../commands/stock");
const {
  openPurchaseTicket,
  handleSelectMercadoPago,
  handleSelectPayPal,
  handleVerifyMercadoPago,
  handleConfirmPayPal,
  handleCloseTicket: closeRobloxTicket
} = require("../sales/robloxTickets");

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
      if (isCs2CommandBlockedInGuild(interaction.guildId, interaction.commandName)) {
        return interaction.reply({ content: "❌ Los comandos de Counter-Strike y Matchmaking están desactivados en este servidor.", flags: 64 });
      }

      if (!isMemberAuthorizedInSpecialGuild(interaction)) {
        return interaction.reply({ content: "❌ No puedes usar comandos en este canal porque es de solo lectura (no tienes permiso para escribir aquí).", flags: 64 });
      }

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

      const disabledMenu = StringSelectMenuBuilder.from(interaction.component).setDisabled(true).setPlaceholder("Ya canjeaste esta recompensa");
      await interaction.update({ components: [new ActionRowBuilder().addComponents(disabledMenu)] }).catch(() => {});

      await interaction.followUp({ content: `🔑 Acá tenés tu acceso de **${resource}** (7 días):\n\`\`\`${key.key_value}\`\`\``, flags: 64 });
      await warnIfLowStock(interaction.client, guildId, resource);
      await refreshStockPanel(interaction.client, guildId);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "shop_buy_select") {
      const productId = Number(interaction.values[0]);
      const product = db.prepare("SELECT * FROM shop_products WHERE id = ? AND guild_id = ?").get(productId, interaction.guildId);
      if (!product) {
        return interaction.reply({ content: "Ese producto ya no está disponible.", flags: 64 });
      }

      await interaction.deferReply({ flags: 64 });
      const channel = await createProductTicket(interaction.guild, interaction.member, product).catch((e) => {
        console.error("[ticket-tienda] Error creando el ticket:", e);
        return null;
      });
      if (!channel) {
        return interaction.editReply({ content: "No pude crear el ticket. Avisale a un staff." });
      }
      return interaction.editReply({ content: `✅ Ticket creado: ${channel}` });
    }

    if (interaction.isButton() && interaction.customId === "alliance_ticket_open") {
      await interaction.deferReply({ flags: 64 });
      const result = await createAllianceTicket(interaction.guild, interaction.member).catch((e) => {
        console.error("[ticket-alianza] Error creando el ticket:", e);
        return null;
      });
      if (!result) return interaction.editReply({ content: "No pude crear el ticket. Avisale a un staff." });
      return interaction.editReply({ content: result.created ? `✅ Ticket creado: ${result.channel}` : `Ya tenés un ticket de alianza abierto: ${result.channel}` });
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

    if (interaction.isButton() && interaction.customId.startsWith("embed_color:")) {
      if (!isStaffOrCeito(interaction)) {
        return interaction.reply({ content: "Solo el staff o ceito pueden cambiar el color.", flags: 64 });
      }

      const [, messageId] = interaction.customId.split(":");
      const modal = new ModalBuilder()
        .setCustomId(`embed_color_modal:${messageId}`)
        .setTitle("Cambiar color del embed")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("hex")
              .setLabel("Color hex (ej: #e60000)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("#e60000")
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("embed_color_modal:")) {
      const [, messageId] = interaction.customId.split(":");
      const hexInput = interaction.fields.getTextInputValue("hex").trim();
      const normalized = hexInput.startsWith("#") ? hexInput.slice(1) : hexInput;

      if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return interaction.reply({ content: "❌ Ese no es un color hex válido. Ejemplo: `#e60000`.", flags: 64 });
      }

      const mensaje = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!mensaje || mensaje.embeds.length === 0) {
        return interaction.reply({ content: "❌ No encontré el embed original.", flags: 64 });
      }

      const nuevoEmbed = EmbedBuilder.from(mensaje.embeds[0]).setColor(parseInt(normalized, 16));
      await mensaje.edit({ embeds: [nuevoEmbed] }).catch(() => null);

      return interaction.reply({ content: `✅ Color actualizado a \`#${normalized}\`.`, flags: 64 });
    }

    if (interaction.isButton() && interaction.customId.startsWith("giveaway_enter:")) {
      const [, giveawayIdRaw] = interaction.customId.split(":");
      const giveawayId = Number(giveawayIdRaw);
      const giveaway = getGiveawayById(giveawayId);

      if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: "❌ Este sorteo ya terminó.", flags: 64 });
      }

      const { joined } = toggleGiveawayEntry(giveawayId, interaction.user.id);
      const entries = countGiveawayEntries(giveawayId);

      const oldEmbed = interaction.message.embeds[0];
      const newEmbed = EmbedBuilder.from(oldEmbed).setFields(
        oldEmbed.fields.map((f) => (f.name === "Participantes" ? { name: "Participantes", value: `${entries}`, inline: f.inline } : f))
      );
      await interaction.update({ embeds: [newEmbed] }).catch(() => {});

      return interaction.followUp({ content: joined ? "🎉 ¡Entraste al sorteo!" : "Saliste del sorteo.", flags: 64 });
    }

    if (interaction.isButton() && interaction.customId.startsWith("giveaway_reroll:")) {
      if (!isStaffOrCeito(interaction)) {
        return interaction.reply({ content: "Solo el staff o ceito pueden rerollear.", flags: 64 });
      }

      const [, giveawayIdRaw] = interaction.customId.split(":");
      const giveawayId = Number(giveawayIdRaw);
      const giveaway = getGiveawayById(giveawayId);
      if (!giveaway) {
        return interaction.reply({ content: "❌ No encontré ese sorteo.", flags: 64 });
      }

      const entries = getGiveawayEntries(giveawayId);
      const winners = pickWinners(entries, giveaway.winners_count);

      await interaction.reply({
        content:
          winners.length > 0
            ? `🎲 **Reroll** — nuevo${winners.length === 1 ? "" : "s"} ganador${winners.length === 1 ? "" : "es"} de **${giveaway.prize}**: ${winners.map((id) => `<@${id}>`).join(", ")}`
            : `🎲 No hay participantes para rerollear **${giveaway.prize}**.`
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === "test_key_dm") {
      const resources = getAvailableResources(interaction.guildId);

      const embed = new EmbedBuilder()
        .setTitle("🎉 ¡Felicidades, conseguiste 5 invitaciones!")
        .setColor(0x2ecc71)
        .setDescription(
          resources.length > 0
            ? "Elegí 7 días de uno de los siguientes recursos y te mando la key acá mismo:\n\n⚠️ Esto es una **simulación**, si elegís una opción no se descuenta stock real."
            : "Todavía no hay recursos cargados para canjear.\n\n⚠️ Esto es una **simulación**."
        );

      const components = [];
      if (resources.length > 0) {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("test_key_select")
          .setPlaceholder("Elegí un recurso")
          .addOptions(resources.map((r) => ({ label: `${r.resource} (7 días)`, value: r.resource, description: `Stock: ${r.stock}` })));
        components.push(new ActionRowBuilder().addComponents(menu));
      }

      const dmSent = await interaction.user.send({ embeds: [embed], components }).catch(() => null);

      if (!dmSent) {
        return interaction.reply({ content: "❌ No pude enviarte el DM (revisá que tengas los mensajes directos abiertos).", flags: 64 });
      }
      return interaction.reply({ content: "✅ Te mandé la simulación por DM.", flags: 64 });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "test_key_select") {
      const resource = interaction.values[0];
      await interaction.reply({
        content: `🔑 Acá tenés tu key de **${resource}** (7 días):\n\`\`\`${resource.toUpperCase().replace(/\s+/g, "")}-TEST-TEST-TEST-TEST\`\`\`\n⚠️ Esta es una key de prueba, no funciona de verdad.`,
        flags: 64
      });
      return;
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

    // ── Ceitus Roblox — panel de ventas ──────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith("roblox_buy:")) {
      const planId = interaction.customId.split(":")[1];
      await interaction.deferReply({ flags: 64 });
      const result = await openPurchaseTicket(interaction.guild, interaction.member, planId).catch((e) => {
        console.error("[roblox-ticket] Error abriendo ticket:", e);
        return null;
      });
      if (!result) return interaction.editReply({ content: "❌ No pude crear el ticket. Avisale al staff." });
      return interaction.editReply({ content: result.created ? `✅ Ticket creado: ${result.channel}` : `Ya tenés un ticket abierto: ${result.channel}` });
    }

    if (interaction.isButton() && interaction.customId.startsWith("roblox_pay_mp:")) {
      const planId = interaction.customId.split(":")[1];
      return handleSelectMercadoPago(interaction, planId);
    }

    if (interaction.isButton() && interaction.customId.startsWith("roblox_pay_pp:")) {
      const planId = interaction.customId.split(":")[1];
      return handleSelectPayPal(interaction, planId);
    }

    if (interaction.isButton() && interaction.customId.startsWith("roblox_verify_mp:")) {
      const planId = interaction.customId.split(":")[1];
      return handleVerifyMercadoPago(interaction, planId);
    }

    if (interaction.isButton() && interaction.customId.startsWith("roblox_confirm_pp:")) {
      const parts = interaction.customId.split(":");
      const planId = parts[1];
      const userId = parts[2];
      return handleConfirmPayPal(interaction, planId, userId);
    }

    if (interaction.isButton() && interaction.customId === "roblox_close_ticket") {
      return closeRobloxTicket(interaction);
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
