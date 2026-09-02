const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { buildJailImage } = require("../utils/jailBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jail")
    .setDescription("Mete a alguien en la cárcel (rejas sobre su avatar)")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a encarcelar").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });

    await interaction.deferReply();
    try {
      const buffer = await buildJailImage(avatarUrl);
      const attachment = new AttachmentBuilder(buffer, { name: "jail.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[jail] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el jail, intenta de nuevo." });
    }
  }
};
