// Deja bonito el server de Jugluc ("Los Pinky"). Es idempotente: se puede correr
// varias veces, busca por nombre antes de crear y nunca borra canales ni roles.
require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const GUILD_ID = "1544716660559192106";
const PINK = 0xff8fc7;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// De abajo hacia arriba (así quedan ordenados justo encima de @everyone)
const ROLES = [
  { name: "🎨 Artista", color: 0xffa3d1 },
  { name: "🎮 Gamer", color: 0x7ec8ff },
  { name: "🔔 Notis de Live", color: 0xff5c8a, mentionable: true },
  { name: "💗 Pinky", color: 0xffc2e0, hoist: true },
  { name: "🌿 Menta", color: 0x9ff0c9 },
  { name: "🩵 Celeste", color: 0x9fd8ff },
  { name: "💜 Lila", color: 0xc9a0ff },
  { name: "🌸 Rosa", color: 0xff9ecf },
  { name: "🌟 VIP", color: 0xffd36e, hoist: true },
  {
    name: "🛡️ Mods",
    color: 0xb57bff,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.ManageNicknames
    ]
  }
];

// Canales: `from` = nombre actual (se renombra y mueve), si no existe se crea
const LAYOUT = [
  {
    category: "🌸 ┃ INICIO",
    channels: [
      { from: "reglas", name: "📜┃reglas", topic: "Leé las reglas antes de participar 💗", readOnly: true },
      { from: "🌸bienvenidas", name: "🌸┃bienvenidas", topic: "¡Bienvenidos a Los Pinky! 🌸", readOnly: true },
      { name: "📢┃anuncios", topic: "Novedades de Jugluc y del server", readOnly: true },
      { name: "🎀┃roles", topic: "Elegí tus roles con los botones 🎀", readOnly: true }
    ]
  },
  {
    category: "🔴 ┃ STREAM",
    channels: [
      { from: "✨avisos-de-live", name: "✨┃avisos-de-live", topic: "Aviso automático cuando Jugluc está en directo en TikTok 🔴", readOnly: true },
      { from: "🤭clips-graciosos", name: "🎬┃clips-graciosos", topic: "Los mejores momentos de los directos 😂" },
      { name: "💡┃ideas-para-stream", topic: "Proponé dinámicas, juegos o retos para los directos ✨" }
    ]
  },
  {
    category: "💞 ┃ COMUNIDAD",
    channels: [
      { from: "💞general", name: "💞┃general", topic: "Charla general de Los Pinky 💞" },
      { from: "🩷charlas-de-chill", name: "🩷┃charlas-de-chill", topic: "Para hablar tranqui 🩷" },
      { name: "📸┃fotos-y-memes", topic: "Fotos, memes y arte 📸" },
      { from: "🎧music", name: "🎧┃music", topic: "Compartí tu música 🎧" },
      { name: "🤖┃comandos", topic: "Usá los comandos del bot acá 🤖" }
    ]
  },
  {
    category: "🔊 ┃ VOZ",
    channels: [
      { from: "Sala", name: "💬 Sala", voice: true },
      { from: "🎮Juegos", name: "🎮 Juegos", voice: true },
      { name: "🌙 Chill", voice: true },
      { name: "🎥 Viendo el stream", voice: true }
    ]
  }
];

const RULES = [
  "💗 **Respeto ante todo.** Nada de insultos, acoso, racismo ni discriminación.",
  "🚫 **Sin spam ni flood.** Tampoco publicidad de otros servers o redes sin permiso.",
  "🔞 **Contenido apropiado.** Nada NSFW, gore ni contenido ofensivo.",
  "🎬 **Cada cosa en su canal.** Clips en #clips, memes en #fotos-y-memes, comandos en #comandos.",
  "🔒 **Privacidad.** No compartas datos personales tuyos ni de otros.",
  "🎥 **Durante los directos**, no hagas spoilers ni spam en el chat de Jugluc.",
  "🛡️ **Hacé caso a Mods y Admins.** Si tenés un problema, avisales por privado.",
  "✨ **Pasala lindo.** Esta es una comunidad para divertirse 🌸"
];

async function ensureRoles(guild) {
  await guild.roles.fetch();
  const made = {};
  for (const def of ROLES) {
    let role = guild.roles.cache.find((r) => r.name === def.name);
    const data = { color: def.color, hoist: !!def.hoist, mentionable: !!def.mentionable };
    if (def.permissions) data.permissions = def.permissions;
    if (!role) {
      role = await guild.roles.create({ name: def.name, ...data, reason: "Setup Los Pinky" });
      console.log("+ rol", def.name);
    } else {
      await role.edit(data);
    }
    made[def.name] = role;
  }
  // El orden de los roles se ajustó a mano (la API no deja reordenar en bloque por jerarquía)
  return made;
}

async function ensureLayout(guild, roles) {
  const channels = await guild.channels.fetch();
  const everyone = guild.roles.everyone;
  const byName = (name, type) => channels.find((c) => c && c.name === name && (type == null || c.type === type));

  let catPos = 0;
  const result = {};
  for (const group of LAYOUT) {
    let cat = byName(group.category, ChannelType.GuildCategory);
    if (!cat) {
      cat = await guild.channels.create({ name: group.category, type: ChannelType.GuildCategory });
      console.log("+ categoría", group.category);
    }
    await cat.setPosition(catPos++);

    let pos = 0;
    for (const def of group.channels) {
      const type = def.voice ? ChannelType.GuildVoice : ChannelType.GuildText;
      let ch = byName(def.name, type) || (def.from && byName(def.from, type));
      if (!ch) {
        ch = await guild.channels.create({ name: def.name, type, parent: cat.id });
        console.log("+ canal", def.name);
      } else {
        if (ch.name !== def.name) console.log("~ renombro", ch.name, "→", def.name);
        await ch.edit({ name: def.name, parent: cat.id, lockPermissions: false });
      }
      if (def.topic && !def.voice) await ch.setTopic(def.topic);
      if (def.readOnly) {
        await ch.permissionOverwrites.edit(everyone, { SendMessages: false, AddReactions: true });
        await ch.permissionOverwrites.edit(roles["🛡️ Mods"], { SendMessages: true });
      }
      await ch.setPosition(pos++);
      result[def.name] = ch;
    }
  }

  // Categorías viejas vacías ("Canales de texto", "Canales de voz") quedan al final, no se borran
  return result;
}

async function postRules(ch) {
  const embed = new EmbedBuilder()
    .setColor(PINK)
    .setTitle("🌸 Reglas de Los Pinky 🌸")
    .setDescription(
      "¡Bienvenid@ a la comunidad de **Jugluc**! 💗\nPara que todos la pasemos lindo, seguí estas reglas:\n\n" +
        RULES.map((r, i) => `**${i + 1}.** ${r}`).join("\n\n")
    )
    .setFooter({ text: "Romper las reglas puede llevar a warn, timeout o ban." });
  await ch.send({ embeds: [embed] });
}

async function postRolesPanel(ch, roles) {
  const btn = (name, style = ButtonStyle.Secondary) => {
    const [emoji, ...rest] = name.split(" ");
    return new ButtonBuilder().setCustomId(`selfrole:${roles[name].id}`).setLabel(rest.join(" ")).setEmoji(emoji).setStyle(style);
  };
  const embed = new EmbedBuilder()
    .setColor(PINK)
    .setTitle("🎀 Elegí tus roles")
    .setDescription(
      "Tocá un botón para ponerte o sacarte un rol ✨\n\n" +
        "🔔 **Notis de Live** — te aviso cuando Jugluc esté en directo\n" +
        "🎮 **Gamer** · 🎨 **Artista** — contanos qué te gusta\n\n" +
        "**🎨 Color de tu nombre** (elegí uno):"
    );
  await ch.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(btn("🔔 Notis de Live", ButtonStyle.Danger), btn("🎮 Gamer"), btn("🎨 Artista")),
      new ActionRowBuilder().addComponents(btn("🌸 Rosa"), btn("💜 Lila"), btn("🩵 Celeste"), btn("🌿 Menta"))
    ]
  });
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const roles = await ensureRoles(guild);
    const chans = await ensureLayout(guild, roles);

    // Solo se publican si el canal está vacío de mensajes del bot
    for (const [name, fn] of [["📜┃reglas", () => postRules(chans["📜┃reglas"])], ["🎀┃roles", () => postRolesPanel(chans["🎀┃roles"], roles)]]) {
      const msgs = await chans[name].messages.fetch({ limit: 20 });
      if (!msgs.some((m) => m.author.id === client.user.id)) {
        await fn();
        console.log("+ mensaje en", name);
      }
    }

    // Rol de miembro a todos los que ya están
    const members = await guild.members.fetch();
    let n = 0;
    for (const m of members.values()) {
      if (!m.user.bot && !m.roles.cache.has(roles["💗 Pinky"].id)) {
        await m.roles.add(roles["💗 Pinky"]).catch(() => {});
        n++;
      }
    }
    console.log(`+ 💗 Pinky a ${n} miembros`);

    console.log("Listo ✨");
  } catch (e) {
    console.error(e);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
