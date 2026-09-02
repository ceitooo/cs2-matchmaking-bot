const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildWastedImage } = require("../utils/wastedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wasted")
    .setDescription("Le pone el clásico WASTED de GTA al avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a wastear").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildWastedImage(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "wasted.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[wasted] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar la imagen, intenta de nuevo." });
    }
  }
};
