const { EmbedBuilder } = require("discord.js");

function buildWelcomeMessage(member, guild, settings) {
  const embed = new EmbedBuilder()
    .setColor(0xe91e8c)
    .setTitle("👋 ¡Nuevo miembro!")
    .setDescription(`Bienvenido ${member} · Miembros: **${guild.memberCount}**`)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? member.displayAvatarURL());

  if (settings.welcome_image_url) {
    embed.setImage(settings.welcome_image_url);
  }

  return { embeds: [embed] };
}

module.exports = { buildWelcomeMessage };
