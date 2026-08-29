const { SlashCommandBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

const MAX_MESSAGES = 200;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purga")
    .setDescription("Borra mensajes recientes del canal (solo staff o ceito)")
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription(`Cantidad de mensajes a borrar (máximo ${MAX_MESSAGES})`).setRequired(true).setMinValue(1).setMaxValue(MAX_MESSAGES)
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const cantidad = interaction.options.getInteger("cantidad", true);
    await interaction.deferReply({ flags: 64 });

    let restante = cantidad;
    let borrados = 0;

    while (restante > 0) {
      const lote = Math.min(restante, 100);
      const eliminados = await interaction.channel.bulkDelete(lote, true).catch(() => null);
      if (!eliminados) break;

      borrados += eliminados.size;
      restante -= lote;

      if (eliminados.size < lote) break; // ya no quedan mensajes borrables (menos de 14 días)
    }

    return interaction.editReply({
      content:
        borrados === 0
          ? "No pude borrar mensajes (puede que sean de más de 14 días, Discord no permite borrado masivo de esos)."
          : `🗑️ Borré ${borrados} mensaje(s).`
    });
  }
};
