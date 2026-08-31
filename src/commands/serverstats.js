const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { getAvailableResources, countActiveSubscriptions, getGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder().setName("serverstats").setDescription("Panel rápido con estadísticas del server (solo staff o ceito)"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const settings = getGuildSettings(guild.id);

    const totalStock = getAvailableResources(guild.id).reduce((sum, r) => sum + r.stock, 0);
    const activeReminders = countActiveSubscriptions(guild.id);

    let openTickets = 0;
    if (settings.shop_ticket_category_id) {
      const category = await guild.channels.fetch(settings.shop_ticket_category_id).catch(() => null);
      if (category) {
        openTickets = guild.channels.cache.filter((c) => c.parentId === category.id && c.type === ChannelType.GuildText && c.name !== "📝・ticket-logs").size;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Estadísticas de ${guild.name}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "Miembros", value: `${guild.memberCount}`, inline: true },
        { name: "Boosts", value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: "Tickets abiertos", value: `${openTickets}`, inline: true },
        { name: "Keys en stock", value: `${totalStock}`, inline: true },
        { name: "Recordatorios activos", value: `${activeReminders}`, inline: true }
      )
      .setThumbnail(guild.iconURL())
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
