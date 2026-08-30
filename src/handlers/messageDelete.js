const { getGuildSettings } = require("../db/database");

function truncate(text, max = 1000) {
  if (!text) return "*(vacío/embed/adjunto)*";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

module.exports = {
  name: "messageDelete",
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const settings = getGuildSettings(message.guild.id);
    if (!settings.log_messages_channel_id) return;

    const channel = await message.guild.channels.fetch(settings.log_messages_channel_id).catch(() => null);
    if (!channel?.isTextBased()) return;

    const attachments = message.attachments?.size ? `\nAdjuntos: ${[...message.attachments.values()].map((a) => a.url).join(", ")}` : "";

    await channel
      .send(
        `🗑️ **Mensaje eliminado** en <#${message.channelId}>\n` +
          `Autor: ${message.author?.tag ?? "Desconocido"} (${message.author?.id ?? "?"})\n\n` +
          `**Contenido:**\n${truncate(message.content)}${attachments}`
      )
      .catch(() => {});
  }
};
