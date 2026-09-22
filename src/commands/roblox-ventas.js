const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { buildSalesPanel } = require("../sales/robloxPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roblox-ventas")
    .setDescription("Administra el sistema de ventas de Ceitus Roblox (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("publicar")
        .setDescription("Publica o actualiza el panel de ventas en un canal")
        .addChannelOption((opt) =>
          opt.setName("canal").setDescription("Canal donde se publica el panel").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configura los canales y roles del sistema")
        .addChannelOption((opt) =>
          opt.setName("tickets").setDescription("Categoría donde se crean los tickets de compra").addChannelTypes(ChannelType.GuildCategory).setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName("proofs").setDescription("Canal donde se publican las ventas completadas").addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .addRoleOption((opt) =>
          opt.setName("rol_cliente").setDescription("Rol que se asigna al comprador después del pago").setRequired(false)
        )
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "publicar") {
      const channel = interaction.options.getChannel("canal", true);
      const payload = buildSalesPanel();

      const settings = getGuildSettings(guildId);
      let message = null;

      if (settings.roblox_panel_channel_id === channel.id && settings.roblox_panel_message_id) {
        message = await channel.messages.fetch(settings.roblox_panel_message_id).catch(() => null);
      }

      if (message) {
        await message.edit(payload).catch(() => { message = null; });
      }

      if (!message) {
        message = await channel.send(payload);
        updateGuildSettings(guildId, {
          roblox_panel_channel_id: channel.id,
          roblox_panel_message_id: message.id
        });
      }

      return interaction.reply({ content: `✅ Panel de Ceitus Roblox publicado en ${channel}.`, flags: 64 });
    }

    if (sub === "setup") {
      const tickets = interaction.options.getChannel("tickets");
      const proofs = interaction.options.getChannel("proofs");
      const rolCliente = interaction.options.getRole("rol_cliente");

      const fields = {};
      if (tickets)    fields.roblox_tickets_category_id = tickets.id;
      if (proofs)     fields.roblox_proofs_channel_id   = proofs.id;
      if (rolCliente) fields.roblox_customer_role_id    = rolCliente.id;

      if (Object.keys(fields).length === 0) {
        return interaction.reply({ content: "No especificaste nada para configurar.", flags: 64 });
      }

      updateGuildSettings(guildId, fields);

      const lines = [];
      if (tickets)    lines.push(`• Categoría de tickets: ${tickets}`);
      if (proofs)     lines.push(`• Canal de proofs: ${proofs}`);
      if (rolCliente) lines.push(`• Rol cliente: ${rolCliente}`);

      return interaction.reply({ content: `✅ Configuración guardada:\n${lines.join("\n")}`, flags: 64 });
    }
  }
};
