const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildWantedImage } = require("../utils/wantedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wanted")
    .setDescription("Genera un cartel de SE BUSCA con el avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario buscado").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildWantedImage(avatarUrl, target.username);
      const attachment = new AttachmentBuilder(buffer, { name: "wanted.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[wanted] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el cartel, intenta de nuevo." });
    }
  }
};
