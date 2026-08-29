const { EmbedBuilder } = require("discord.js");

function buildBoostMessage(member, guild, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.boost_color ?? 0xf47fff)
    .setTitle("💖 ¡Nuevo boost!")
    .setDescription(
      `${member} acaba de mejorar el servidor!${guild.premiumSubscriptionCount ? ` ¡Ceitus llegó a **Nivel ${guild.premiumTier}**!` : ""}\nBoosts totales: **${guild.premiumSubscriptionCount ?? 0}**`
    )
    .setThumbnail(member.displayAvatarURL({ size: 256 }));

  if (settings.boost_image_url) {
    embed.setImage(settings.boost_image_url);
  }

  return { embeds: [embed] };
}

module.exports = { buildBoostMessage };
