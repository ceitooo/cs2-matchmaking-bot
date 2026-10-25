const fs = require("node:fs");
const path = require("node:path");
const { EmbedBuilder } = require("discord.js");

const CHANNEL_ID = "1563314955887976508";
const CACHE_FILE = path.join(__dirname, "..", "..", "data", "last_vouch_id.json");

// Cargar clave de supabase desde .env.backup de ceitotweaks-backend
let serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRole) {
  try {
    const envFile = fs.readFileSync("C:/Users/holad/app de optimizacion/ceitotweaks-backend/.env.backup", "utf8");
    envFile.split("\n").forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1].trim() === "SUPABASE_SERVICE_ROLE_KEY") {
        serviceRole = match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    });
  } catch {}
}

const SUPABASE_URL = "https://cgeyxhvxhygfhecgdama.supabase.co";

function getLastSeenId() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      return Number(data.lastId) || 213;
    }
  } catch {}
  return 213; // Comienza desde la última ya publicada (shockk472)
}

function saveLastSeenId(id) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastId: id, updatedAt: new Date().toISOString() }), "utf8");
  } catch {}
}

function getPlanName(amount) {
  const num = parseFloat(amount);
  if (num >= 20) return "💎 Permanente (Lifetime)";
  if (num >= 14) return "📅 1 Año (365 Días)";
  if (num >= 8.5) return "📅 5 Meses (150 Días)";
  if (num >= 6.5) return "📅 3 Meses (90 Días)";
  if (num >= 2.5) return "📅 1 Mes (30 Días)";
  if (num >= 1.35) return "⚡ Oferta Especial / Lanzamiento";
  if (num >= 1.0) return "⚡ 1 Semana (7 Días)";
  return "💎 CeitoTweaks Premium";
}

async function query(table, params = "") {
  if (!serviceRole) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`
    }
  });
  return await res.json();
}

let _client = null;

function startVouchChecker(client) {
  _client = client;
  console.log("[vouch-checker] Iniciado vigilante de compras en Supabase...");
  if (!serviceRole) console.warn("[vouch-checker] Falta SUPABASE_SERVICE_ROLE_KEY en el .env: no se van a publicar vouches.");

  // Revisar cada 20 segundos
  setInterval(async () => {
    try {
      let lastId = getLastSeenId();
      const newLicenses = await query("licenses", `select=*&amount=gt.0&id=gt.${lastId}&order=id.asc`);

      if (!Array.isArray(newLicenses) || newLicenses.length === 0) return;

      const guild = _client.guilds.cache.get(process.env.GUILD_ID);
      const channel = await guild?.channels.fetch(CHANNEL_ID).catch(() => null);
      if (!channel?.isTextBased()) return;

      const accounts = await query("accounts", "select=username,hardware_id,email,account_number").catch(() => []);

      for (const l of newLicenses) {
        let acc = (accounts || []).find(a => l.bound_hardware_id && a.hardware_id === l.bound_hardware_id);
        if (!acc && l.email) {
          acc = (accounts || []).find(a => a.email && a.email.toLowerCase() === l.email.toLowerCase());
        }

        let displayUser = acc ? `@${acc.username}` : null;
        let accNumber = acc && acc.account_number ? `#${acc.account_number}` : null;

        if (!displayUser && l.email) {
          const cleanPrefix = l.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
          displayUser = `@${cleanPrefix}`;
        }

        const planTitle = getPlanName(l.amount);
        const numMonto = parseFloat(l.amount);
        const montoStr = !isNaN(numMonto) ? numMonto.toFixed(2) : String(l.amount);
        const fechaLocal = new Date(l.created_at).toLocaleString("es-UY", {
          timeZone: "America/Montevideo",
          dateStyle: "medium",
          timeStyle: "short"
        });

        const userField = accNumber ? `**${displayUser}** (\`${accNumber}\`)` : `**${displayUser || "@usuario"}**`;

        const vouchEmbed = new EmbedBuilder()
          .setTitle("🧾 Nueva Compra Verificada")
          .setColor(planTitle.includes("Permanente") ? 0xffb84d : 0x7c5cff)
          .addFields(
            { name: "👤 Usuario en CeitoTweaks", value: userField, inline: true },
            { name: "💎 Plan Adquirido", value: planTitle, inline: true },
            { name: "💵 Monto", value: `**$${montoStr} ${l.currency || "USD"}**`, inline: true },
            { name: "📅 Fecha de Entrega", value: fechaLocal, inline: true },
            { name: "🛡️ Estado", value: "✅ **Verificado & Entregado**", inline: true }
          )
          .setFooter({ text: "CeitoTweaks Premium • Entrega Digital Automática" })
          .setTimestamp(new Date(l.created_at));

        await channel.send({ embeds: [vouchEmbed] });
        console.log(`[vouch-checker] Compra nueva detectada y publicada: ${displayUser} (id: ${l.id})`);

        lastId = l.id;
        saveLastSeenId(lastId);
      }
    } catch (err) {
      console.error("[vouch-checker] Error revisando compras:", err.message);
    }
  }, 20000);
}

module.exports = { startVouchChecker };
