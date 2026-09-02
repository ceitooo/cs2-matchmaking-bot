const { SlashCommandBuilder, EmbedBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

function parseColor(hex) {
  if (!hex) return 0x5865f2;
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const parsed = parseInt(normalized, 16);
  return Number.isNaN(parsed) ? 0x5865f2 : parsed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crea o edita embeds sin tocar código (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("crear")
        .setDescription("Publica un embed nuevo")
        .addStringOption((o) => o.setName("titulo").setDescription("Título del embed").setRequired(true))
        .addStringOption((o) => o.setName("descripcion").setDescription("Cuerpo del embed (podés usar #, ## para títulos grandes)").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal donde publicarlo (default: este canal)").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption((o) => o.setName("color").setDescription("Color hex, ej: #e91e8c").setRequired(false))
        .addAttachmentOption((o) => o.setName("imagen").setDescription("Imagen o gif grande").setRequired(false))
        .addStringOption((o) => o.setName("imagen_url").setDescription("URL de imagen (alternativa al archivo)").setRequired(false))
        .addStringOption((o) => o.setName("thumbnail_url").setDescription("URL de imagen chica (esquina)").setRequired(false))
        .addStringOption((o) => o.setName("footer").setDescription("Texto pequeño al pie").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("editar")
        .setDescription("Edita un embed ya publicado por el bot")
        .addStringOption((o) => o.setName("mensaje_id").setDescription("ID del mensaje a editar").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal donde está el mensaje").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((o) => o.setName("titulo").setDescription("Nuevo título (opcional)").setRequired(false))
        .addStringOption((o) => o.setName("descripcion").setDescription("Nueva descripción (opcional)").setRequired(false))
        .addStringOption((o) => o.setName("color").setDescription("Nuevo color hex (opcional)").setRequired(false))
        .addStringOption((o) => o.setName("imagen_url").setDescription("Nueva imagen URL (opcional)").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("colorbtn")
        .setDescription("Agrega un botón de cambiar color a un embed ya publicado")
        .addStringOption((o) => o.setName("mensaje_id").setDescription("ID del mensaje").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal donde está el mensaje").addChannelTypes(ChannelType.GuildText).setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "crear") {
      const titulo = interaction.options.getString("titulo");
      const descripcion = interaction.options.getString("descripcion");
      const canal = interaction.options.getChannel("canal") ?? interaction.channel;
      const color = parseColor(interaction.options.getString("color"));
      const attachment = interaction.options.getAttachment("imagen");
      const imagenUrl = interaction.options.getString("imagen_url");
      const thumbnailUrl = interaction.options.getString("thumbnail_url");
      const footer = interaction.options.getString("footer");

      const embed = new EmbedBuilder().setTitle(titulo).setDescription(descripcion).setColor(color);
      const imageUrl = attachment?.url || imagenUrl;
      if (imageUrl) embed.setImage(imageUrl);
      if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
      if (footer) embed.setFooter({ text: footer });

      const sent = await canal.send({ embeds: [embed] }).catch(() => null);
      if (!sent) {
        return interaction.reply({ content: `❌ No pude publicar en ${canal}. Revisá mis permisos ahí.`, flags: 64 });
      }

      const button = new ButtonBuilder().setCustomId(`embed_color:${sent.id}`).setLabel("🎨 Cambiar color").setStyle(ButtonStyle.Secondary);
      await sent.edit({ components: [new ActionRowBuilder().addComponents(button)] }).catch(() => {});

      return interaction.reply({ content: `✅ Embed publicado en ${canal} (ID: \`${sent.id}\`, guardalo si después querés editarlo).`, flags: 64 });
    }

    if (sub === "editar") {
      const messageId = interaction.options.getString("mensaje_id");
      const canal = interaction.options.getChannel("canal");

      const mensaje = await canal.messages.fetch(messageId).catch(() => null);
      if (!mensaje) {
        return interaction.reply({ content: "❌ No encontré ese mensaje en ese canal.", flags: 64 });
      }
      if (mensaje.author.id !== interaction.client.user.id) {
        return interaction.reply({ content: "❌ Ese mensaje no lo mandé yo, no lo puedo editar.", flags: 64 });
      }
      if (mensaje.embeds.length === 0) {
        return interaction.reply({ content: "❌ Ese mensaje no tiene ningún embed.", flags: 64 });
      }

      const titulo = interaction.options.getString("titulo");
      const descripcion = interaction.options.getString("descripcion");
      const colorHex = interaction.options.getString("color");
      const imagenUrl = interaction.options.getString("imagen_url");

      const nuevoEmbed = EmbedBuilder.from(mensaje.embeds[0]);
      if (titulo) nuevoEmbed.setTitle(titulo);
      if (descripcion) nuevoEmbed.setDescription(descripcion);
      if (colorHex) nuevoEmbed.setColor(parseColor(colorHex));
      if (imagenUrl) nuevoEmbed.setImage(imagenUrl);

      await mensaje.edit({ embeds: [nuevoEmbed] }).catch(() => null);
      return interaction.reply({ content: "✅ Embed editado.", flags: 64 });
    }

    if (sub === "colorbtn") {
      const messageId = interaction.options.getString("mensaje_id");
      const canal = interaction.options.getChannel("canal");

      const mensaje = await canal.messages.fetch(messageId).catch(() => null);
      if (!mensaje) {
        return interaction.reply({ content: "❌ No encontré ese mensaje en ese canal.", flags: 64 });
      }
      if (mensaje.author.id !== interaction.client.user.id) {
        return interaction.reply({ content: "❌ Ese mensaje no lo mandé yo, no lo puedo editar.", flags: 64 });
      }
      if (mensaje.embeds.length === 0) {
        return interaction.reply({ content: "❌ Ese mensaje no tiene ningún embed.", flags: 64 });
      }

      const button = new ButtonBuilder().setCustomId(`embed_color:${mensaje.id}`).setLabel("🎨 Cambiar color").setStyle(ButtonStyle.Secondary);
      await mensaje.edit({ components: [new ActionRowBuilder().addComponents(button)] }).catch(() => null);

      return interaction.reply({ content: "✅ Botón de color agregado.", flags: 64 });
    }
  }
};
