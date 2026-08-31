const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchReactionGif } = require("../utils/reactionGif");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pat")
    .setDescription("Le das cariñitos en la cabeza a alguien")
    .addUserOption((o) => o.setName("usuario").setDescription("A quién acariciar").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario");

    await interaction.deferReply();
    try {
      const gif = await fetchReactionGif("pat");
      const embed = new EmbedBuilder()
        .setDescription(`🖐️ ${interaction.user} le dio cariñitos a ${target}`)
        .setImage(gif.url)
        .setColor(0x9b59b6);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[pat] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir el gif, intenta de nuevo." });
    }
  }
};
