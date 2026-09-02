const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildMagikImage } = require("../utils/magikBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("magik")
    .setDescription("Distorsiona el avatar de alguien (estilo magik)")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a distorsionar").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();

    try {
      const buffer = await buildMagikImage(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "magik.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[magik] Error generando la imagen:", error);
      await interaction.editReply({ content: "❌ No pude generar el magik, intenta de nuevo." });
    }
  }
};
