const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const OFFSETS_URL = "https://offsets.imtheo.lol/Offsets.json";
const INTERVAL_MS = 2 * 60 * 1000;

let client = null;
let lastVersion = null;

// Canal público: aviso simple de actualización de Roblox
const PUBLIC_CHANNEL_ID = process.env.OFFSETS_PUBLIC_CHANNEL_ID || null;
// Canal privado de staff: dump completo con todos los links
const STAFF_CHANNEL_ID = process.env.OFFSETS_STAFF_CHANNEL_ID || null;

function buildPublicEmbed(prevVersion, newVersion) {
  return new EmbedBuilder()
    .setColor(0xed4245) // rojo — en mantenimiento
    .setTitle("🔄 Roblox se actualizó — Ceitus en Mantenimiento")
    .addFields(
      { name: "📌 Versión anterior", value: `\`${prevVersion}\``, inline: true },
      { name: "✅ Versión nueva",    value: `\`${newVersion}\``,  inline: true },
      { name: "⚙️ Estado",          value: "🔴 **En mantenimiento**", inline: false }
    )
    .setFooter({ text: "Ceitus Roblox External • Monitor automático" })
    .setTimestamp();
}

function buildStaffEmbed(data) {
  const version  = data["Roblox Version"] ?? "desconocida";
  const dumpedAt = data["Dumped At"] ?? "—";
  const total    = data["Total Offsets"] ?? "?";
  const base     = "https://offsets.imtheo.lol";

  return new EmbedBuilder()
    .setColor(0x57f287) // verde
    .setTitle("📦 New Offset Dump")
    .setURL(base)
    .setDescription("An offset dump has been uploaded\nThis Roblox version is **NOT** published yet.")
    .addFields(
      { name: "Version",        value: `\`${version}\``, inline: false },
      { name: "Total offsets",  value: String(total),    inline: true  },
      { name: "Dumped at",      value: dumpedAt,         inline: true  }
    )
    .addFields({
      name: "Links",
      value: [
        `**Offsets** — [C++](${base}/Offsets.hpp) · [C#](${base}/Offsets.cs) · [json](${base}/Offsets.json) · [json (hex)](${base}/OffsetsHex.json) · [txt](${base}/Offsets.txt)`,
        `**FFlags**  — [C++](${base}/FFlags.hpp) · [C#](${base}/FFlags.cs) · [json](${base}/FFlags.json) · [json (hex)](${base}/FFlagsHex.json) · [txt](${base}/FFlags.txt)`,
        `**Misc**    — [C++](${base}/Struct.hpp) · [json](${base}/Types.json)`
      ].join("\n")
    })
    .setFooter({ text: "theo's offsets • offsets.imtheo.lol" })
    .setTimestamp();
}

function buildStaffButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Ver sitio").setURL("https://offsets.imtheo.lol/"),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Discord").setURL("https://offsets.imtheo.lol/discord")
  );
}

async function sendToChannel(channelId, payload) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    console.warn(`[offsets] Canal ${channelId} no encontrado o no es de texto.`);
    return;
  }
  await channel.send(payload).catch((e) => console.error(`[offsets] Error enviando a ${channelId}:`, e.message));
}

async function runCheck() {
  try {
    const res = await fetch(OFFSETS_URL);
    if (!res.ok) return;
    const data = await res.json();

    const version = data["Roblox Version"];
    if (!version) return;

    if (lastVersion === null) {
      lastVersion = version;
      console.log(`[offsets] Versión inicial: ${version}`);
      return;
    }

    if (version === lastVersion) return;

    const prevVersion = lastVersion;
    lastVersion = version;
    console.log(`[offsets] Nueva versión detectada: ${version} (antes: ${prevVersion})`);

    // Canal público — aviso simple
    await sendToChannel(PUBLIC_CHANNEL_ID, {
      embeds: [buildPublicEmbed(prevVersion, version)]
    });

    // Canal staff — dump completo
    await sendToChannel(STAFF_CHANNEL_ID, {
      embeds: [buildStaffEmbed(data)],
      components: [buildStaffButtons()]
    });
  } catch (e) {
    console.error("[offsets] Error al revisar:", e.message);
  }
}

function startOffsetsChecker(discordClient) {
  client = discordClient;
  const loop = () => runCheck().finally(() => setTimeout(loop, INTERVAL_MS));
  setTimeout(loop, 10_000);
  console.log("[offsets] Monitor de offsets activo.");
}

module.exports = { startOffsetsChecker };
