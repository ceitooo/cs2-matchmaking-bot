const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildSpinGif } = require("../utils/spinBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spin")
    .setDescription("Hace girar el avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a girar").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildSpinGif(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "spin.gif" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[spin] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el gif, intenta de nuevo." });
    }
  }
};
