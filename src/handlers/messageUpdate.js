const { getGuildSettings } = require("../db/database");

function truncate(text, max = 900) {
  if (!text) return "*(vacío/embed/adjunto)*";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // evita ruido por embeds que cargan tarde

    const settings = getGuildSettings(newMessage.guild.id);
    if (!settings.log_messages_channel_id) return;

    const channel = await newMessage.guild.channels.fetch(settings.log_messages_channel_id).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel
      .send(
        `✏️ **Mensaje editado** en <#${newMessage.channelId}>\n` +
          `Autor: ${newMessage.author?.tag ?? "Desconocido"} (${newMessage.author?.id ?? "?"})\n\n` +
          `**Antes:**\n${truncate(oldMessage.content)}\n\n` +
          `**Ahora:**\n${truncate(newMessage.content)}`
      )
      .catch(() => {});
  }
};
