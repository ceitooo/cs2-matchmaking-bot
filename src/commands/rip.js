const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildRipImage } = require("../utils/ripBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rip")
    .setDescription("Genera una lápida con el avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a enterrar").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildRipImage(avatarUrl, target.username);
      const attachment = new AttachmentBuilder(buffer, { name: "rip.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[rip] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar la lápida, intenta de nuevo." });
    }
  }
};
