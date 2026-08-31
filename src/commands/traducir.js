const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("traducir")
    .setDescription("Traduce un texto")
    .addStringOption((o) => o.setName("texto").setDescription("Texto a traducir").setRequired(true))
    .addStringOption((o) => o.setName("idioma").setDescription("Idioma destino (ej: en, es, pt, ja)").setRequired(true)),

  async execute(interaction) {
    const texto = interaction.options.getString("texto");
    const idioma = interaction.options.getString("idioma").toLowerCase();

    await interaction.deferReply();
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(idioma)}&dt=t&q=${encodeURIComponent(texto)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Respondió ${res.status}`);

      const data = await res.json();
      const traduccion = data[0].map((chunk) => chunk[0]).join("");
      const idiomaDetectado = data[2];

      const embed = new EmbedBuilder()
        .setTitle("🌐 Traducción")
        .setColor(0x4285f4)
        .addFields({ name: `Original (${idiomaDetectado})`, value: texto.slice(0, 1000) }, { name: `Traducido a ${idioma}`, value: traduccion.slice(0, 1000) });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[traducir] Error:", error.message);
      await interaction.editReply({ content: "❌ No pude traducir eso, probá con otro idioma (ej: en, es, pt, ja, fr)." });
    }
  }
};
