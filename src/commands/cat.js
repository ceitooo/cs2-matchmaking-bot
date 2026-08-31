const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("cat").setDescription("Manda un gatito random y adorable"),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch("https://cataas.com/cat?json=true");
      if (!res.ok) throw new Error(`cataas respondió ${res.status}`);
      const data = await res.json();

      const imageUrl = data.url.startsWith("http") ? data.url : `https://cataas.com${data.url}`;
      const embed = new EmbedBuilder().setTitle("🐱 Miau").setImage(imageUrl).setColor(0xffa500);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[cat] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir un gatito, intenta de nuevo." });
    }
  }
};
