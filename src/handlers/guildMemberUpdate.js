const { getGuildSettings } = require("../db/database");

async function logNicknameChange(oldMember, newMember, settings) {
  if (oldMember.nickname === newMember.nickname) return;
  if (!settings.log_nicknames_channel_id) return;

  const channel = await newMember.guild.channels.fetch(settings.log_nicknames_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const before = oldMember.nickname ?? oldMember.user.username;
  const after = newMember.nickname ?? newMember.user.username;

  await channel
    .send(`✏️ **Apodo cambiado**\nUsuario: ${newMember.user.tag} (${newMember.id})\nAntes: ${before}\nAhora: ${after}`)
    .catch(() => {});
}

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    const settings = getGuildSettings(newMember.guild.id);

    // El anuncio de boost lo maneja messageCreate: ahí borramos el mensaje de
    // sistema de Discord y lo reemplazamos por el embed con imagen.
    await logNicknameChange(oldMember, newMember, settings);
  }
};
