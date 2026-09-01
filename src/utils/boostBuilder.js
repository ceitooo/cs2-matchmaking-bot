const { EmbedBuilder } = require("discord.js");
const { resolveMedia } = require("./mediaStore");

function buildBoostMessage(member, guild, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.boost_color ?? 0xf47fff)
    .setTitle("💖 ¡Nuevo boost!")
    .setDescription(
      `${member} acaba de mejorar el servidor!${guild.premiumSubscriptionCount ? ` ¡Ceitus llegó a **Nivel ${guild.premiumTier}**!` : ""}\nBoosts totales: **${guild.premiumSubscriptionCount ?? 0}**`
    )
    .setThumbnail(member.displayAvatarURL({ size: 256 }));

  const { image, files } = resolveMedia(settings.boost_image_url);
  if (image) embed.setImage(image);

  return { embeds: [embed], files };
}

module.exports = { buildBoostMessage };
