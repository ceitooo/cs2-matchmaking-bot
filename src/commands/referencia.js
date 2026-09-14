const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("referencia")
    .setDescription("Dejá tu referencia de una compra que hiciste")
    .addUserOption((o) => o.setName("vendedor").setDescription("A quién le compraste").setRequired(true))
    .addStringOption((o) => o.setName("producto").setDescription("Qué compraste").setRequired(true))
    .addIntegerOption((o) => o.setName("calificacion").setDescription("Del 1 al 5").setRequired(false).setMinValue(1).setMaxValue(5))
    .addStringOption((o) => o.setName("nota").setDescription("Precio, comentario, lo que quieras agregar").setRequired(false)),

  async execute(interaction) {
    const vendedor = interaction.options.getUser("vendedor");
    const producto = interaction.options.getString("producto");
    const calificacion = interaction.options.getInteger("calificacion");
    const nota = interaction.options.getString("nota");

    const embed = new EmbedBuilder()
      .setColor(0xe60000)
      .setTitle("🧾 Nueva referencia")
      .setDescription(`${interaction.user} le compró a ${vendedor}`)
      .addFields({ name: "Producto", value: producto, inline: true });

    if (calificacion) embed.addFields({ name: "Calificación", value: `${"⭐".repeat(calificacion)} (${calificacion}/5)`, inline: true });
    if (nota) embed.addFields({ name: "Nota", value: nota, inline: true });

    embed.setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
