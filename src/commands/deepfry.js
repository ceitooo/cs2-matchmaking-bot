const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildDeepfryImage } = require("../utils/deepfryBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deepfry")
    .setDescription("Frie el avatar de alguien (deepfry meme)")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a freír").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildDeepfryImage(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "deepfry.jpg" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[deepfry] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el deepfry, intenta de nuevo." });
    }
  }
};
