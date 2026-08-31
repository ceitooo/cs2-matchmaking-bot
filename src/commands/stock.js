const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAvailableResources } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder().setName("stock").setDescription("Muestra cuántas keys quedan disponibles por recurso"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const resources = getAvailableResources(interaction.guild.id);

    if (resources.length === 0) {
      return interaction.reply({ content: "📭 No hay keys en stock ahora mismo.", flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle("📦 Stock de keys")
      .setColor(0x5865f2)
      .setDescription(resources.map((r) => `**${r.resource}** — ${r.stock} disponible${r.stock === 1 ? "" : "s"}`).join("\n"))
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
