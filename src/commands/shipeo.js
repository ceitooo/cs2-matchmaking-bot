const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { buildShipImage } = require("../utils/shipBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shipeo")
    .setDescription("Calcula la compatibilidad entre dos personas")
    .addUserOption((o) => o.setName("usuario1").setDescription("Primera persona").setRequired(true))
    .addUserOption((o) => o.setName("usuario2").setDescription("Segunda persona (default vos)").setRequired(false)),

  async execute(interaction) {
    const a = interaction.options.getUser("usuario1");
    const b = interaction.options.getUser("usuario2") ?? interaction.user;

    await interaction.deferReply();

    try {
      const avatarA = a.displayAvatarURL({ extension: "png", size: 256 });
      const avatarB = b.displayAvatarURL({ extension: "png", size: 256 });
      const { buffer, porcentaje } = await buildShipImage(avatarA, avatarB, a.id, b.id);

      const attachment = new AttachmentBuilder(buffer, { name: "shipeo.png" });
      const embed = new EmbedBuilder()
        .setTitle("💘 Shipeo")
        .setColor(0xff69b4)
        .setDescription(`${a} 💞 ${b}\n\n**${porcentaje}%** compatibles`)
        .setImage("attachment://shipeo.png");

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error("[shipeo] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar el shipeo, intenta de nuevo." });
    }
  }
};
