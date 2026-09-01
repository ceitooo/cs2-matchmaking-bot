const { EmbedBuilder } = require("discord.js");
const { resolveMedia } = require("./mediaStore");

function buildWelcomeMessage(member, guild, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.welcome_color ?? 0xe91e8c)
    .setTitle("👋 ¡Nuevo miembro!")
    .setDescription(`Bienvenido ${member} · Miembros: **${guild.memberCount}**`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }));

  const { image, files } = resolveMedia(settings.welcome_image_url);
  if (image) embed.setImage(image);

  return { embeds: [embed], files };
}

module.exports = { buildWelcomeMessage };
