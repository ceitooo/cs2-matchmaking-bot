const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

const LOG_CHANNELS = [
  { key: "log_server_channel_id", name: "📜┃server-logs" },
  { key: "log_bans_channel_id", name: "🔨┃ban-logs" },
  { key: "log_warns_channel_id", name: "⚠️┃warn-logs" },
  { key: "log_nicknames_channel_id", name: "✏️┃nickname-logs" },
  { key: "log_messages_channel_id", name: "🗑️┃mensajes-logs" },
  { key: "log_verifications_channel_id", name: "✅┃verificaciones-logs" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Crea la categoría y los canales de logs del servidor (solo se ejecuta una vez)"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const me = interaction.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ Necesito el permiso **Gestionar canales** para crear la categoría de logs.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const category = await interaction.guild.channels.create({
      name: "📋┃Logs",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
    });

    const fields = { logs_category_id: category.id };

    for (const logChannel of LOG_CHANNELS) {
      const channel = await interaction.guild.channels.create({
        name: logChannel.name,
        type: ChannelType.GuildText,
        parent: category.id
      });
      fields[logChannel.key] = channel.id;
    }

    updateGuildSettings(interaction.guild.id, fields);

    await interaction.editReply({ content: `✅ Categoría de logs creada: ${category}` });
  }
};
