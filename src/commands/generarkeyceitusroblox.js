const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");
const https = require("https");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const API_HOST = "ceitotweaks-backend.vercel.app";
const API_PATH = "/api/owner-stats";

function randSeg(n = 4) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

function generateKey() {
  return `CEITUS-${randSeg()}-${randSeg()}-${randSeg()}-${randSeg()}`;
}

function postJSON(body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: API_HOST,
        path: API_PATH,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      }
    );
    req.on("error", () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function createKeyInBackend(key, days, alias) {
  return postJSON({
    action: "ceitus-create",
    adminPass: process.env.CEITUS_ADMIN_PASS,
    key,
    days,
    alias,
  });
}

const PLANES = {
  "1d":        { label: "1 Día",      days: 1  },
  "3d":        { label: "3 Días",     days: 3  },
  "7d":        { label: "7 Días",     days: 7  },
  "14d":       { label: "14 Días",    days: 14 },
  "30d":       { label: "30 Días",    days: 30 },
  "permanente":{ label: "Permanente", days: 0  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("generarkeyceitusroblox")
    .setDescription("Genera keys de Ceitus Roblox y las registra en el backend (solo staff)")
    .addIntegerOption((o) =>
      o.setName("cantidad").setDescription("Cuántas keys generar (1–10)").setRequired(true).setMinValue(1).setMaxValue(10)
    )
    .addStringOption((o) =>
      o.setName("plan").setDescription("Duración del plan").setRequired(true)
        .addChoices(
          { name: "1 Día",      value: "1d"         },
          { name: "3 Días",     value: "3d"         },
          { name: "7 Días",     value: "7d"         },
          { name: "14 Días",    value: "14d"        },
          { name: "30 Días",    value: "30d"        },
          { name: "Permanente", value: "permanente" }
        )
    )
    .addStringOption((o) =>
      o.setName("nota").setDescription("Motivo / nota (ej: giveaway, manual, venta)").setRequired(false)
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tenés permiso para usar este comando.", flags: 64 });
    }

    await interaction.deferReply();

    const cantidad = interaction.options.getInteger("cantidad");
    const plan     = interaction.options.getString("plan");
    const nota     = interaction.options.getString("nota") ?? "Generación Manual / Staff";
    const { label, days } = PLANES[plan];

    const keys = Array.from({ length: cantidad }, generateKey);

    // Subir todas las keys al backend en paralelo
    const results = await Promise.all(keys.map((k) => createKeyInBackend(k, days, nota)));
    const ok   = results.filter((r) => r?.ok).length;
    const fail = cantidad - ok;

    const keysField = keys.map((k) => `\`${k}\``).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🔑 Licencias Generadas con Éxito")
      .setColor(fail === 0 ? 0x2ecc71 : 0xe67e22)
      .addFields(
        { name: "• Producto / Programa", value: "Ceitus 〔Roblox〕 External (`roblox`)", inline: false },
        { name: "• Plan",                value: label, inline: true  },
        { name: "• Motivo / Nota",       value: nota,  inline: true  },
        { name: `Claves de Licencia (${cantidad})`, value: keysField, inline: false }
      )
      .setFooter({
        text:
          `Generado por ${interaction.user.username} • hoy a las ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` +
          (fail > 0 ? ` • ⚠️ ${fail} no se guardaron en backend` : ""),
      })
      .setTimestamp();

    const copyBtn = new ButtonBuilder()
      .setCustomId(`copy_keys_${interaction.id}`)
      .setLabel("📋 Copiar todas")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(copyBtn);

    await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.customId === `copy_keys_${interaction.id}`,
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      await i.reply({
        content: `\`\`\`\n${keys.join("\n")}\n\`\`\``,
        flags: 64,
      });
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
