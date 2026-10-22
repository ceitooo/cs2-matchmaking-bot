require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const PUBLIC_CHANNEL_ID  = process.env.OFFSETS_PUBLIC_CHANNEL_ID;
const STAFF_CHANNEL_ID   = process.env.OFFSETS_STAFF_CHANNEL_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log("Bot listo, enviando pruebas...");

  const prevVersion = "version-4310300497aa4917";
  const newVersion  = "version-02c37bc51a384b8f";
  const base        = "https://offsets.imtheo.lol";

  // ── Canal público ────────────────────────────────────────────────
  if (PUBLIC_CHANNEL_ID) {
    const ch = await client.channels.fetch(PUBLIC_CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) {
      await ch.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🔄 Roblox se actualizó — Ceitus en Mantenimiento")
            .addFields(
              { name: "📌 Versión anterior", value: `\`${prevVersion}\``, inline: true },
              { name: "✅ Versión nueva",    value: `\`${newVersion}\``,  inline: true },
              { name: "⚙️ Estado",          value: "🔴 **En mantenimiento**", inline: false }
            )
            .setFooter({ text: "Ceitus Roblox External • Monitor automático" })
            .setTimestamp()
        ]
      });
      console.log("✅ Enviado al canal público.");
    } else {
      console.warn("❌ Canal público no encontrado.");
    }
  }

  // ── Canal staff ──────────────────────────────────────────────────
  if (STAFF_CHANNEL_ID) {
    const ch = await client.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) {
      await ch.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("📦 New Offset Dump")
            .setURL(base)
            .setDescription("An offset dump has been uploaded\nThis Roblox version is **NOT** published yet.")
            .addFields(
              { name: "Version",       value: `\`${newVersion}\``, inline: false },
              { name: "Total offsets", value: "392",               inline: true  },
              { name: "Dumped at",     value: "20:12 29/09/2026",  inline: true  }
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
            .setTimestamp()
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Ver sitio").setURL(base + "/"),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Discord").setURL(base + "/discord")
          )
        ]
      });
      console.log("✅ Enviado al canal staff.");
    } else {
      console.warn("❌ Canal staff no encontrado.");
    }
  }

  client.destroy();
});

client.login(process.env.DISCORD_TOKEN);
