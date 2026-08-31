const { SlashCommandBuilder } = require("discord.js");
const { deleteKey } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("eliminarkey")
    .setDescription("Elimina una key específica del stock (solo si no fue usada)")
    .addStringOption((o) => o.setName("key").setDescription("La key exacta a eliminar").setRequired(true)),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const key = interaction.options.getString("key").trim().toUpperCase();
    const removed = deleteKey(interaction.guild.id, key);

    if (removed === 0) {
      return interaction.reply({ content: `❌ No encontré esa key sin usar en el stock: \`${key}\``, flags: 64 });
    }

    return interaction.reply({ content: `🗑️ Key eliminada: \`${key}\``, flags: 64 });
  }
};
