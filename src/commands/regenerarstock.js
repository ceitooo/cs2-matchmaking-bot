const { SlashCommandBuilder } = require("discord.js");
const { addKey, getAvailableResources } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("regenerarstock")
    .setDescription("Carga keys (generadas con el otro bot) al pool de premios por invitaciones")
    .addStringOption((o) => o.setName("recurso").setDescription("Nombre del recurso (ej: Ceitus, Netflix, Disney+)").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("keys")
        .setDescription("Las keys a cargar, una por línea (o separadas por coma/espacio)")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const resource = interaction.options.getString("recurso").trim();
    const rawKeys = interaction.options.getString("keys");

    const keys = rawKeys
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      return interaction.reply({ content: "❌ No encontré ninguna key válida en el texto.", flags: 64 });
    }

    for (const key of keys) {
      addKey(interaction.guild.id, resource, key, interaction.user.id);
    }

    const stock = getAvailableResources(interaction.guild.id).find((r) => r.resource === resource)?.stock ?? keys.length;

    await interaction.reply({
      content: `✅ ${keys.length} key${keys.length === 1 ? "" : "s"} cargada${keys.length === 1 ? "" : "s"} para **${resource}** (stock disponible: ${stock}).`,
      flags: 64
    });
  }
};
