const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildRainbowGif } = require("../utils/rainbowBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rainbow")
    .setDescription("Le pone un efecto arcoíris animado al avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a colorear").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildRainbowGif(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "rainbow.gif" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[rainbow] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el gif, intenta de nuevo." });
    }
  }
};
