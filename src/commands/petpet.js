const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildPetpetGif } = require("../utils/petpetBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("petpet")
    .setDescription("Genera un GIF acariciando el avatar de un usuario")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a acariciar").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();

    try {
      const buffer = await buildPetpetGif(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "petpet.gif" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[petpet] Error generando el gif:", error);
      await interaction.editReply({ content: "❌ No pude generar el petpet, intenta de nuevo." });
    }
  }
};
