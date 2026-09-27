const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");
const { PLATFORMS } = require("../streams/platforms");
const { addSub, removeSub, listSubs, buildLiveMessage, buildVideoMessage } = require("../streams/checker");

const platformChoices = Object.entries(PLATFORMS).map(([value, p]) => ({ name: p.name, value }));

function normalize(platform, username) {
  // Acepta el usuario o el link del perfil (tiktok.com/@x, twitch.tv/x, youtube.com/@x, kick.com/x)
  let u = username.trim().replace(/^(https?:\/\/)?(www\.|m\.)?[\w.-]+\.(com|tv)\//i, "").replace(/[/?#].*$/, "");
  if (platform === "youtube") return u.startsWith("UC") ? u : "@" + u.replace(/^@/, "");
  return u.replace(/^@/, "").toLowerCase();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream")
    .setDescription("Notificaciones de directos y videos (Twitch, YouTube, Kick, TikTok)")
    .addSubcommand((s) =>
      s
        .setName("añadir")
        .setDescription("Avisar cuando una cuenta empiece directo (o suba video en YouTube)")
        .addStringOption((o) => o.setName("plataforma").setDescription("Plataforma").setRequired(true).addChoices(...platformChoices))
        .addStringOption((o) => o.setName("usuario").setDescription("Usuario o link del perfil").setRequired(true))
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal donde avisar").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addRoleOption((o) => o.setName("rol").setDescription("Rol a mencionar (opcional)"))
        .addStringOption((o) => o.setName("mensaje").setDescription("Texto personalizado. Usa {user}, {platform}, {link} (directo), {perfil}"))
    )
    .addSubcommand((s) =>
      s
        .setName("quitar")
        .setDescription("Dejar de avisar de una cuenta")
        .addStringOption((o) => o.setName("plataforma").setDescription("Plataforma").setRequired(true).addChoices(...platformChoices))
        .addStringOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
    )
    .addSubcommand((s) => s.setName("lista").setDescription("Ver las cuentas configuradas"))
    .addSubcommand((s) =>
      s
        .setName("probar")
        .setDescription("Envía un aviso de prueba de una cuenta configurada")
        .addStringOption((o) => o.setName("plataforma").setDescription("Plataforma").setRequired(true).addChoices(...platformChoices))
        .addStringOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ Solo el staff puede configurar las notificaciones de directos.", flags: 64 });
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "lista") {
      const subs = listSubs(guildId);
      if (!subs.length) return interaction.reply({ content: "No hay cuentas configuradas. Usa `/stream añadir`.", flags: 64 });
      const lines = subs.map((s) => {
        const p = PLATFORMS[s.platform];
        const rol = s.role_id ? ` · <@&${s.role_id}>` : "";
        return `${p.emoji} **${p.name}** — [${s.username}](${p.profile(s.username)}) → <#${s.channel_id}>${rol}`;
      });
      const embed = new EmbedBuilder().setTitle("📡 Notificaciones de streams").setColor(0x5865f2).setDescription(lines.join("\n"));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    const platform = interaction.options.getString("plataforma");
    const username = normalize(platform, interaction.options.getString("usuario"));
    const p = PLATFORMS[platform];

    if (sub === "quitar") {
      const n = removeSub(guildId, platform, username);
      return interaction.reply({ content: n ? `🗑️ Ya no se avisará de **${username}** en ${p.name}.` : "❌ Esa cuenta no estaba configurada.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });
    let result;
    try {
      result = await p.check(username);
    } catch (e) {
      return interaction.editReply(`❌ No pude consultar ${p.name}: ${e.message}`);
    }
    if (result.notFound) return interaction.editReply(`❌ No encontré la cuenta **${username}** en ${p.name}. Revisa que esté escrita igual que en la plataforma.`);

    if (sub === "añadir") {
      const channel = interaction.options.getChannel("canal");
      const role = interaction.options.getRole("rol");
      // Se guarda el estado actual para no avisar de un directo/video que ya estaba antes de añadirlo
      addSub({
        guildId,
        platform,
        username,
        channelId: channel.id,
        roleId: role?.id,
        message: interaction.options.getString("mensaje"),
        lastLiveId: result.live?.id,
        lastVideoId: result.video?.id,
        createdBy: interaction.user.id
      });
      const extra = platform === "youtube" ? " y cuando suba un video nuevo" : "";
      const estado = result.live ? "\n🔴 Ahora mismo está en directo (este directo no se avisa, sí los siguientes)." : "";
      return interaction.editReply(`✅ Avisaré en ${channel} cuando **${result.displayName || username}** empiece directo en ${p.name}${extra}.${estado}`);
    }

    if (sub === "probar") {
      const s = listSubs(guildId).find((x) => x.platform === platform && x.username === username);
      if (!s) return interaction.editReply("❌ Esa cuenta no está configurada. Primero usa `/stream añadir`.");
      const channel = await interaction.client.channels.fetch(s.channel_id).catch(() => null);
      if (!channel) return interaction.editReply("❌ No encuentro el canal configurado.");
      const fake = {
        ...result,
        live: result.live ?? { id: "test", title: "Directo de prueba", category: "Just Chatting", viewers: 0, thumbnail: null, url: p.profile(username) }
      };
      await channel.send(buildLiveMessage({ ...s, role_id: null }, fake, { test: true }));
      if (platform === "youtube" && result.video) await channel.send(buildVideoMessage({ ...s, role_id: null }, result));
      return interaction.editReply(`✅ Aviso de prueba enviado en ${channel} (sin mencionar el rol).`);
    }
  }
};
