const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchReactionGif } = require("../utils/reactionGif");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slap")
    .setDescription("Le pegas una cachetada a alguien")
    .addUserOption((o) => o.setName("usuario").setDescription("A quién cachetear").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario");
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "❌ No podés cachetearte a vos mismo." });
    }

    await interaction.deferReply();
    try {
      const gif = await fetchReactionGif("slap");
      const embed = new EmbedBuilder()
        .setDescription(`👋 ${interaction.user} le pegó una cachetada a ${target}`)
        .setImage(gif.url)
        .setColor(0xe74c3c);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[slap] Error:", error);
      await interaction.editReply({ content: "❌ No pude conseguir el gif, intenta de nuevo." });
    }
  }
};
