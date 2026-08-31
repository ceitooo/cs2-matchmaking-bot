const { SlashCommandBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

const MAX_MESSAGES = 200;
const SCAN_CAP = 500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purga")
    .setDescription("Borra mensajes recientes del canal (solo staff o ceito)")
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription(`Cantidad de mensajes a borrar (máximo ${MAX_MESSAGES})`).setRequired(true).setMinValue(1).setMaxValue(MAX_MESSAGES)
    )
    .addUserOption((opt) => opt.setName("usuario").setDescription("Solo borrar mensajes de este usuario").setRequired(false))
    .addStringOption((opt) => opt.setName("contiene").setDescription("Solo borrar mensajes que contengan este texto").setRequired(false)),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const cantidad = interaction.options.getInteger("cantidad", true);
    const usuario = interaction.options.getUser("usuario");
    const contiene = interaction.options.getString("contiene")?.toLowerCase();

    await interaction.deferReply({ flags: 64 });

    let toDelete = [];
    let lastId;
    let scanned = 0;

    if (!usuario && !contiene) {
      let restante = cantidad;
      let borrados = 0;
      while (restante > 0) {
        const lote = Math.min(restante, 100);
        const eliminados = await interaction.channel.bulkDelete(lote, true).catch(() => null);
        if (!eliminados) break;
        borrados += eliminados.size;
        restante -= lote;
        if (eliminados.size < lote) break;
      }
      return interaction.editReply({
        content: borrados === 0 ? "No pude borrar mensajes (puede que sean de más de 14 días)." : `🗑️ Borré ${borrados} mensaje(s).`
      });
    }

    while (toDelete.length < cantidad && scanned < SCAN_CAP) {
      const batch = await interaction.channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) }).catch(() => null);
      if (!batch || batch.size === 0) break;

      scanned += batch.size;
      lastId = batch.last().id;

      for (const m of batch.values()) {
        if (usuario && m.author.id !== usuario.id) continue;
        if (contiene && !m.content.toLowerCase().includes(contiene)) continue;
        toDelete.push(m);
        if (toDelete.length >= cantidad) break;
      }

      if (batch.size < 100) break;
    }

    let borrados = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const eliminados = await interaction.channel.bulkDelete(chunk, true).catch(() => null);
      if (eliminados) borrados += eliminados.size;
    }

    return interaction.editReply({
      content: borrados === 0 ? "No encontré mensajes que cumplan ese filtro (o son de más de 14 días)." : `🗑️ Borré ${borrados} mensaje(s) que cumplían el filtro.`
    });
  }
};
