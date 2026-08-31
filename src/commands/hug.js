const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchReactionGif } = require("../utils/reactionGif");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Le das un abrazo a alguien")
    .addUserOption((o) => o.setName("usuario").setDescription("A quién abrazar").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario");

    await interaction.deferReply();
    try {
      const gif = await fetchReactionGif("hug");
      const embed = new EmbedBuilder()
        .setDescription(
          target.id === interaction.user.id
            ? `🤗 ${interaction.user} se abraza a sí mismo... alguien que lo abrace 🥺`
            : `🤗 ${interaction.user} le dio un abrazo a ${target}`
        )
        .setImage(gif.url)
        .setColor(0xf1c40f);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[hug] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir el gif, intenta de nuevo." });
    }
  }
};
