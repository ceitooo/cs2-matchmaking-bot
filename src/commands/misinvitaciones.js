const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db, INVITES_PER_REWARD } = require("../db/database");

module.exports = {
  data: new SlashCommandBuilder().setName("misinvitaciones").setDescription("Mira cuántas invitaciones llevás y cuánto te falta para tu próximo premio"),

  async execute(interaction) {
    const row = db.prepare("SELECT * FROM invites WHERE guild_id = ? AND user_id = ?").get(interaction.guild.id, interaction.user.id);

    const uses = row?.uses ?? 0;
    const rewardProgress = row?.reward_progress ?? 0;
    const faltan = INVITES_PER_REWARD - (uses % INVITES_PER_REWARD);

    const embed = new EmbedBuilder()
      .setTitle("📨 Tus invitaciones")
      .setColor(0x5865f2)
      .addFields(
        { name: "Invitaciones totales", value: `${uses}`, inline: true },
        { name: "Premios reclamados", value: `${rewardProgress}`, inline: true },
        { name: "Te faltan para el próximo", value: `${uses % INVITES_PER_REWARD === 0 ? INVITES_PER_REWARD : faltan}`, inline: true }
      )
      .setFooter({ text: `Cada ${INVITES_PER_REWARD} invitaciones = 1 día del producto en stock` });

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
