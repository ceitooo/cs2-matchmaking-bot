const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

function compatibilidad(idA, idB) {
  const combined = [idA, idB].sort().join("");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 100000;
  }
  return hash % 101;
}

function barra(porcentaje) {
  const llenos = Math.round(porcentaje / 10);
  return "💖".repeat(llenos) + "🤍".repeat(10 - llenos);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shipeo")
    .setDescription("Calcula la compatibilidad entre dos personas")
    .addUserOption((o) => o.setName("usuario1").setDescription("Primera persona").setRequired(true))
    .addUserOption((o) => o.setName("usuario2").setDescription("Segunda persona (default vos)").setRequired(false)),

  async execute(interaction) {
    const a = interaction.options.getUser("usuario1");
    const b = interaction.options.getUser("usuario2") ?? interaction.user;

    const porcentaje = compatibilidad(a.id, b.id);

    const embed = new EmbedBuilder()
      .setTitle("💘 Shipeo")
      .setColor(0xff69b4)
      .setDescription(`${a} 💞 ${b}\n\n**${porcentaje}%** compatibles\n${barra(porcentaje)}`);

    return interaction.reply({ embeds: [embed] });
  }
};
