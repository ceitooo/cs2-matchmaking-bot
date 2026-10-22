const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserSubscriptions } = require("../db/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("milicencia")
    .setDescription("Muestra el tiempo restante de tu licencia activa"),

  async execute(interaction) {
    const subs = getUserSubscriptions(interaction.guildId, interaction.user.id);

    if (subs.length === 0) {
      return interaction.reply({
        content: "No tens ninguna licencia activa en este servidor.",
        flags: 64,
      });
    }

    const lines = subs.map((sub) => {
      const remaining = sub.expires_at - Date.now();
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return `**${sub.product}**\n\`${days}d ${hours}h ${minutes}m ${seconds}s\``;
    });

    const embed = new EmbedBuilder()
      .setTitle("Tu Licencia")
      .setColor(0x2ecc71)
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: `${interaction.user.username}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
