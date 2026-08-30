const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-invitaciones")
    .setDescription("Crea la categoría y el canal donde se avisa quién invitó a quién (solo se ejecuta una vez)"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const me = interaction.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels) || !me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "❌ Necesito los permisos **Gestionar canales** y **Gestionar servidor** (este último para leer las invitaciones).",
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    const category = await interaction.guild.channels.create({
      name: "📨┃Invitaciones",
      type: ChannelType.GuildCategory
    });

    const channel = await interaction.guild.channels.create({
      name: "📨┃invitaciones",
      type: ChannelType.GuildText,
      parent: category.id
    });

    updateGuildSettings(interaction.guild.id, {
      invites_category_id: category.id,
      invites_channel_id: channel.id
    });

    await interaction.editReply({ content: `✅ Canal de invitaciones creado: ${channel}` });
  }
};
