const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { getLevel, getRank, xpThreshold } = require("../db/database");
const { buildRankCard } = require("../utils/rankBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Muestra tu tarjeta de nivel (o la de otro usuario)")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Ver el rank de otro usuario").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;

    await interaction.deferReply();
    try {
      const { xp, level } = getLevel(interaction.guild.id, target.id);
      const rank = getRank(interaction.guild.id, target.id);
      const threshold = xpThreshold(level);

      const buffer = await buildRankCard({
        avatarUrl: target.displayAvatarURL({ extension: "png", size: 256 }),
        username: target.username,
        level,
        xp,
        threshold,
        rank
      });

      const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[rank] Error:", error);
      await interaction.editReply({ content: "❌ No pude generar la tarjeta, intenta de nuevo." });
    }
  }
};
