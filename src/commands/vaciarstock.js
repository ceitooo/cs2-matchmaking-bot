const { SlashCommandBuilder } = require("discord.js");
const { clearStock } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vaciarstock")
    .setDescription("Elimina las keys sin usar del stock (todas o de un recurso puntual)")
    .addStringOption((o) =>
      o.setName("recurso").setDescription("Nombre del recurso a vaciar (ej: Ceitus). Si no lo pasás, vacía todo el stock.").setRequired(false)
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const resource = interaction.options.getString("recurso")?.trim() || null;
    const removed = clearStock(interaction.guild.id, resource);

    if (removed === 0) {
      return interaction.reply({
        content: resource ? `📭 No había keys sin usar para **${resource}**.` : "📭 No había keys sin usar en el stock.",
        flags: 64
      });
    }

    return interaction.reply({
      content: resource
        ? `🗑️ Eliminé **${removed}** key${removed === 1 ? "" : "s"} sin usar de **${resource}**.`
        : `🗑️ Eliminé **${removed}** key${removed === 1 ? "" : "s"} sin usar de todo el stock.`,
      flags: 64
    });
  }
};
