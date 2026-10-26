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
const { getProducts, getProductById, buildProductDetailPanel } = require("../utils/shopBuilder");
const USER_ROLE_ID = "1339103137901969439";
const { createAllianceTicket, createSupportTicket, createProductTicket, closeTicket, pingRoleIds, canPing, registerPing } = require("../utils/tickets");
const { isStaffOrCeito, isCommandBlockedHelpOnly, isMemberAuthorizedInSpecialGuild } = require("../utils/permissions");
const { pickWinners } = require("../utils/giveawayChecker");
const { refreshStockPanel } = require("../commands/stock");
const {
  openPurchaseTicket,
  handleDeliverKey,
  handleCloseTicket: closeRobloxTicket
} = require("../sales/robloxTickets");

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

async function _handle(interaction) {
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

    // Autoroles genéricos: botón con customId "selfrole:<roleId>" pone/quita el rol
    if (interaction.isButton() && interaction.customId.startsWith("selfrole:")) {
      const roleId = interaction.customId.split(":")[1];
      const role = interaction.guild?.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: "❌ Ese rol ya no existe.", flags: 64 });
      const has = interaction.member.roles.cache.has(roleId);
      try {
        if (has) await interaction.member.roles.remove(roleId);
        else await interaction.member.roles.add(roleId);
      } catch {
        return interaction.reply({ content: "❌ No pude cambiar el rol (revisa la jerarquía de roles del bot).", flags: 64 });
      }
      return interaction.reply({ content: has ? `➖ Te quité **${role.name}**` : `➕ Ahora tienes **${role.name}**`, flags: 64 });
    }

    if (interaction.isChatInputCommand()) {
      if (isCommandBlockedHelpOnly(interaction)) {
        return interaction.reply({ content: "❌ No tienes permiso para usar este comando en este servidor.", flags: 64 });
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

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("invite_reward:")) {
      const [, guildId] = interaction.customId.split(":");
      const resource = interaction.values[0];

      const key = claimKey(guildId, resource, interaction.user.id);
      if (!key) {
        return interaction.reply({ content: `❌ Se quedó sin stock justo ahora. Avisale a un admin para que cargue más de **${resource}**.`, flags: 64 });
      }

      const disabledMenu = StringSelectMenuBuilder.from(interaction.component).setDisabled(true).setPlaceholder("Ya canjeaste esta recompensa");
      await interaction.update({ components: [new ActionRowBuilder().addComponents(disabledMenu)] }).catch(() => {});

      await interaction.followUp({ content: `🔑 Acá tenés tu acceso de **${resource}** (1 semana de Premium):\n\`\`\`${key.key_value}\`\`\``, flags: 64 });
      await warnIfLowStock(interaction.client, guildId, resource);
      await refreshStockPanel(interaction.client, guildId);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "shop_buy_select") {
      const productId = Number(interaction.values[0]);
      const product = getProductById(productId, interaction.guildId);
      if (!product) {
        return interaction.reply({ content: "Ese producto ya no está disponible.", flags: 64 });
      }

      // Enviar el panel del producto de forma privada (efímera) solo a esa persona
      const panel = buildProductDetailPanel(product);
      return interaction.reply({ ...panel, flags: 64 });
    }

    if (interaction.isButton() && interaction.customId.startsWith("shop_confirm_buy:")) {
      const productId = Number(interaction.customId.split(":")[1]);
      const product = getProductById(productId, interaction.guildId);
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
      return interaction.editReply({ content: `✅ ¡Orden de compra iniciada! Tu ticket privado fue creado: ${channel}` });
    }

    if (interaction.isButton() && interaction.customId === "shop_cancel_ephemeral") {
      return interaction.update({ content: "🔒 Panel cerrado.", embeds: [], components: [] }).catch(() => {});
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

    if (interaction.isButton() && interaction.customId === "server_verify") {
      const role = interaction.guild.roles.cache.get(USER_ROLE_ID);
      const gifRole = interaction.guild.roles.cache.get("1422305716890370048");
      if (!role) return interaction.reply({ content: "No encontré el rol de verificación. Avisale a un staff.", flags: 64 });
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({ content: "Ya estás verificado.", flags: 64 });
      }
      const rolesToAdd = [role.id];
      if (gifRole) rolesToAdd.push(gifRole.id);
      await interaction.member.roles.add(rolesToAdd, "Verificación por botón").catch(() => null);
      return interaction.reply({ content: "✅ ¡Listo! Ya tenés acceso a todos los canales.", flags: 64 });
    }

    if (interaction.isButton() && interaction.customId === "support_ticket_open") {
      await interaction.deferReply({ flags: 64 });
      const result = await createSupportTicket(interaction.guild, interaction.member).catch((e) => {
        console.error("[ticket-soporte] Error creando el ticket:", e);
        return null;
      });
      if (!result) return interaction.editReply({ content: "No pude crear el ticket. Avisale a un staff." });
      return interaction.editReply({ content: result.created ? `✅ Ticket creado: ${result.channel}` : `Ya tenés un ticket de soporte abierto: ${result.channel}` });
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
        .setTitle("🎉 ¡Felicidades, conseguiste 10 invitaciones!")
        .setColor(0x2ecc71)
        .setDescription(
          resources.length > 0
            ? "Elegí 1 semana de Premium de uno de los siguientes recursos y te mando la key acá mismo:\n\n⚠️ Esto es una **simulación**, si elegís una opción no se descuenta stock real."
            : "Todavía no hay recursos cargados para canjear.\n\n⚠️ Esto es una **simulación**."
        );

      const components = [];
      if (resources.length > 0) {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("test_key_select")
          .setPlaceholder("Elegí un recurso")
          .addOptions(resources.map((r) => ({ label: `${r.resource} (1 semana de Premium)`, value: r.resource, description: `Stock: ${r.stock}` })));
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
        content: `🔑 Acá tenés tu key de **${resource}** (1 semana de Premium):\n\`\`\`${resource.toUpperCase().replace(/\s+/g, "")}-TEST-TEST-TEST-TEST\`\`\`\n⚠️ Esta es una key de prueba, no funciona de verdad.`,
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
    if (interaction.isStringSelectMenu() && interaction.customId === "roblox_select_plan") {
      const planId = interaction.values[0].replace("roblox_plan_", "");
      await interaction.deferReply({ flags: 64 });
      const result = await openPurchaseTicket(interaction.guild, interaction.member, planId).catch((e) => {
        console.error("[roblox-ticket] Error abriendo ticket:", e);
        return null;
      });
      if (!result) return interaction.editReply({ content: "❌ No pude crear el ticket. Avisale al staff." });
      return interaction.editReply({ content: result.created ? `✅ Ticket creado: ${result.channel}` : `Ya tenés un ticket abierto: ${result.channel}` });
    }

    if (interaction.isButton() && interaction.customId.startsWith("roblox_deliver:")) {
      const parts = interaction.customId.split(":");
      return handleDeliverKey(interaction, parts[1], parts[2]);
    }

    if (interaction.isButton() && interaction.customId === "roblox_close_ticket") {
      return closeRobloxTicket(interaction);
    }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      await _handle(interaction);
    } catch (e) {
      if (e?.code === 10062) return;
      console.error("[interactionCreate] Error:", e?.message ?? e);
    }
  }
};
