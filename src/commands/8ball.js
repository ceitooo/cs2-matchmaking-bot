const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const RESPUESTAS = [
  "Sí, totalmente.",
  "Es seguro.",
  "Sin duda.",
  "Definitivamente sí.",
  "Puedes confiar en ello.",
  "Tal como lo veo, sí.",
  "Probablemente.",
  "Las perspectivas son buenas.",
  "Las señales apuntan a que sí.",
  "Respuesta borrosa, intenta de nuevo.",
  "Pregunta más tarde.",
  "Mejor no te digo ahora.",
  "No puedo predecirlo.",
  "Concéntrate y pregunta de nuevo.",
  "No cuentes con eso.",
  "Mi respuesta es no.",
  "Mis fuentes dicen que no.",
  "Las perspectivas no son buenas.",
  "Muy dudoso."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Le preguntas a la bola 8")
    .addStringOption((o) => o.setName("pregunta").setDescription("Tu pregunta").setRequired(true)),

  async execute(interaction) {
    const pregunta = interaction.options.getString("pregunta");
    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

    const embed = new EmbedBuilder()
      .setTitle("🎱 Bola 8")
      .setColor(0x2c2f33)
      .addFields({ name: "Pregunta", value: pregunta }, { name: "Respuesta", value: respuesta });

    return interaction.reply({ embeds: [embed] });
  }
};
