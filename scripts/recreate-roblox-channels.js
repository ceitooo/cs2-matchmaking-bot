require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { buildInfoEmbed, saveState } = require("../src/utils/infoPanel");

const GUILD_ID    = process.env.GUILD_ID;
const CATEGORY_ID = "1542357676439248976"; // 🛒・Ceitus Sales
const ZIP_PATH    = "C:\\Users\\holad\\chetox\\Ceitus_v1.0.9.zip";

const PERMS_READONLY = (guild, botId) => [
  { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
  { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] }
];

async function getOrCreate(guild, name, botId, topic = "") {
  let ch = guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
  if (!ch) {
    ch = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      topic,
      permissionOverwrites: PERMS_READONLY(guild, botId)
    });
    console.log(`✅ Canal creado: #${name} (${ch.id})`);
  } else {
    console.log(`ℹ️  Canal ya existe: #${name} (${ch.id})`);
  }
  return ch;
}

function embedV109() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.9 — Roblox External")
    .setColor(0x5865f2)
    .setDescription("**Aimbot 3x más rápido, FOV circle, snap indicator y fly.**")
    .addFields(
      { name: "🎯 Aimbot más rápido", value: "El aimbot se pega a la cabeza casi instantáneo. 3x más rápido que antes." },
      { name: "⭕ FOV Circle", value: "Círculo de FOV que sigue tu cursor en todo momento. Se pone verde cuando hay lock." },
      { name: "📍 Snap Indicator", value: "Cuando el aimbot tiene un target, aparece un punto verde en la cabeza y una línea desde el cursor hasta ahí." },
      { name: "🦅 Fly (F/C)", value: "Mantén **F** para subir y **C** para bajar. Velocidad configurable. Teclas cambiables desde el menú." },
      { name: "👻 Noclip & Anti-AFK", value: "Noclip corregido. Anti-AFK funciona en segundo plano sin enfocar Roblox." }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", async () => {
  console.log(`[recreate] Bot: ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    // ── 1) ceitus-roblox-descargar ──
    const descCh = await getOrCreate(guild, "ceitus-roblox-descargar", client.user.id,
      "Descargá Ceitus Roblox External desde acá.");

    // Borrar mensajes viejos del bot en ese canal
    const descMsgs = await descCh.messages.fetch({ limit: 50 });
    for (const m of descMsgs.filter(m => m.author.id === client.user.id).values())
      await m.delete().catch(() => {});

    // Publicar embed de info
    const infoMsg = await descCh.send({ embeds: [buildInfoEmbed("activo", null)] });
    saveState({ messageId: infoMsg.id, channelId: descCh.id, status: "activo", version: null });
    console.log(`✅ Embed de info publicado (${infoMsg.id})`);

    // Publicar ZIP
    const attachment = new AttachmentBuilder(ZIP_PATH, { name: "Ceitus_v1.0.9.zip" });
    await descCh.send({ files: [attachment] });
    console.log("✅ ZIP publicado en #ceitus-roblox-descargar");

    // ── 2) ceitus-roblox ──
    const updCh = await getOrCreate(guild, "ceitus-roblox", client.user.id,
      "Novedades y actualizaciones de Ceitus Roblox External.");

    // Borrar mensajes viejos del bot con embeds
    const updMsgs = await updCh.messages.fetch({ limit: 50 });
    for (const m of updMsgs.filter(m => m.author.id === client.user.id && m.embeds.length > 0).values())
      await m.delete().catch(() => {});

    await updCh.send({ embeds: [embedV109()] });
    console.log("✅ Embed v1.0.9 publicado en #ceitus-roblox");

  } catch (err) {
    console.error("[recreate] Error:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
