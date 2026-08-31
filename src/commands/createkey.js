const { SlashCommandBuilder } = require("discord.js");
const { addKey, getAvailableResources } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createkey")
    .setDescription("Carga una key al pool de premios por invitaciones")
    .addStringOption((o) => o.setName("recurso").setDescription("Nombre del recurso (ej: Ceitus, Netflix, Disney+)").setRequired(true))
    .addStringOption((o) => o.setName("key").setDescription("La key/código a entregar").setRequired(true)),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const resource = interaction.options.getString("recurso").trim();
    const key = interaction.options.getString("key").trim();

    addKey(interaction.guild.id, resource, key, interaction.user.id);

    const stock = getAvailableResources(interaction.guild.id).find((r) => r.resource === resource)?.stock ?? 1;

    await interaction.reply({ content: `✅ Key agregada al pool de **${resource}** (stock disponible: ${stock}).`, flags: 64 });
  }
};
