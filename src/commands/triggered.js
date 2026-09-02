const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildTriggerGif } = require("../utils/triggerBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("triggered")
    .setDescription("Genera el clásico gif de TRIGGERED con el avatar de alguien")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a triggerear").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildTriggerGif(avatarUrl, { withText: true });
      const attachment = new AttachmentBuilder(buffer, { name: "triggered.gif" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[triggered] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el gif, intenta de nuevo." });
    }
  }
};
