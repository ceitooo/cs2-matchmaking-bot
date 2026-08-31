const { SlashCommandBuilder } = require("discord.js");
const { addPersonalReminder } = require("../db/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("recordarme")
    .setDescription("Te manda un DM en el futuro con lo que quieras recordar")
    .addStringOption((o) => o.setName("mensaje").setDescription("Qué querés que te recuerde").setRequired(true))
    .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad de tiempo").setRequired(true).setMinValue(1))
    .addStringOption((o) =>
      o
        .setName("unidad")
        .setDescription("Unidad de tiempo")
        .setRequired(true)
        .addChoices({ name: "minutos", value: "minutos" }, { name: "horas", value: "horas" }, { name: "días", value: "dias" })
    ),

  async execute(interaction) {
    const mensaje = interaction.options.getString("mensaje");
    const cantidad = interaction.options.getInteger("cantidad");
    const unidad = interaction.options.getString("unidad");

    const MINUTE_MS = 60 * 1000;
    const minutosEquivalentes = unidad === "dias" ? cantidad * 24 * 60 : unidad === "horas" ? cantidad * 60 : cantidad;
    const remindAt = Date.now() + minutosEquivalentes * MINUTE_MS;

    addPersonalReminder(interaction.guild.id, interaction.user.id, mensaje, remindAt);

    return interaction.reply({ content: `⏰ Listo, te aviso <t:${Math.floor(remindAt / 1000)}:R> por DM: "${mensaje}"`, flags: 64 });
  }
};
