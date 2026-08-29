const { EmbedBuilder } = require("discord.js");

function buildWelcomeMessage(member, guild, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.welcome_color ?? 0xe91e8c)
    .setTitle("👋 ¡Nuevo miembro!")
    .setDescription(`Bienvenido ${member} · Miembros: **${guild.memberCount}**`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }));

  if (settings.welcome_image_url) {
    embed.setImage(settings.welcome_image_url);
  }

  return { embeds: [embed] };
}

module.exports = { buildWelcomeMessage };
