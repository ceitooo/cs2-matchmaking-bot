const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchReactionGif } = require("../utils/reactionGif");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("Le das un beso a alguien")
    .addUserOption((o) => o.setName("usuario").setDescription("A quién besar").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario");
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "❌ No podés besarte a vos mismo." });
    }

    await interaction.deferReply();
    try {
      const gif = await fetchReactionGif("kiss");
      const embed = new EmbedBuilder()
        .setDescription(`💋 ${interaction.user} le dio un beso a ${target}`)
        .setImage(gif.url)
        .setColor(0xff69b4);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[kiss] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir el gif, intenta de nuevo." });
    }
  }
};
