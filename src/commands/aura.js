const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const AURA_QUERIES = ["aura farming", "aura points", "instant aura", "aura meme"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("aura")
    .setDescription("Manda un gif random de aura")
    .addUserOption((o) => o.setName("usuario").setDescription("A quién le das/quitás aura").setRequired(false)),

  async execute(interaction) {
    if (!process.env.GIPHY_API_KEY) {
      return interaction.reply({ content: "❌ Falta configurar GIPHY_API_KEY en el bot.", flags: 64 });
    }

    await interaction.deferReply();
    try {
      const query = AURA_QUERIES[Math.floor(Math.random() * AURA_QUERIES.length)];
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=25&rating=pg-13`
      );
      if (!res.ok) throw new Error(`Giphy respondió ${res.status}`);
      const data = await res.json();

      const results = data.data ?? [];
      if (results.length === 0) throw new Error("Sin resultados");

      const gif = results[Math.floor(Math.random() * results.length)];
      const target = interaction.options.getUser("usuario");
      const points = Math.floor(Math.random() * 2000) - 1000;
      const sign = points >= 0 ? "+" : "";

      const embed = new EmbedBuilder()
        .setDescription(
          target
            ? `✨ ${target} ${points >= 0 ? "ganó" : "perdió"} **${sign}${points} de aura**`
            : `✨ ${interaction.user} tiene un momento de **${sign}${points} de aura**`
        )
        .setImage(gif.images.original.url)
        .setColor(0x9b59b6);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[aura] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir el gif, intenta de nuevo." });
    }
  }
};
