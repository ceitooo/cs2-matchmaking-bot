const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { setStickyMessage, getStickyMessage, setStickyMessageId, removeStickyMessage } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stickymensaje")
    .setDescription("Administra un mensaje fijo que siempre queda al final del canal (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("crear")
        .setDescription("Crea o reemplaza el sticky de un canal")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal donde va el sticky").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((o) => o.setName("texto").setDescription("Contenido del mensaje (soporta saltos de línea con \\n)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("quitar")
        .setDescription("Quita el sticky de un canal")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal del sticky a quitar").addChannelTypes(ChannelType.GuildText).setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel("canal", true);

    if (sub === "crear") {
      const texto = interaction.options.getString("texto", true).replace(/\\n/g, "\n");

      const old = getStickyMessage(channel.id);
      if (old?.message_id) {
        const oldMsg = await channel.messages.fetch(old.message_id).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      setStickyMessage(interaction.guildId, channel.id, texto, interaction.user.id);

      const sent = await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(texto)] }).catch(() => null);
      if (!sent) {
        return interaction.reply({ content: "❌ No pude mandar el mensaje en ese canal (revisá permisos del bot).", flags: 64 });
      }
      setStickyMessageId(channel.id, sent.id);

      return interaction.reply({ content: `✅ Sticky creado en ${channel}. Se va a reenviar solo al final cada vez que alguien mande un mensaje ahí.`, flags: 64 });
    }

    if (sub === "quitar") {
      const existing = getStickyMessage(channel.id);
      if (!existing) {
        return interaction.reply({ content: "❌ Ese canal no tiene un sticky configurado.", flags: 64 });
      }

      if (existing.message_id) {
        const msg = await channel.messages.fetch(existing.message_id).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }

      removeStickyMessage(channel.id);
      return interaction.reply({ content: `✅ Sticky quitado de ${channel}.`, flags: 64 });
    }
  }
};
