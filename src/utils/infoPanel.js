const fs   = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const STATE_FILE = path.join(__dirname, "../../data/ceitus-info-panel.json");

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; }
}

function saveState(data) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...loadState(), ...data }, null, 2), "utf8");
}

function buildInfoEmbed(status = "activo", version = null) {
  const isActive = status === "activo";
  const statusField = isActive
    ? "🟢 **Activo / Undetected** — External, VAC Safe"
    : "🔴 **En mantenimiento** — Actualizando para la nueva versión de Roblox...";

  const embed = new EmbedBuilder()
    .setTitle("🎮  Ceitus v1.0.5  —  Roblox External")
    .setColor(isActive ? 0x4488FF : 0xFF8800)
    .setDescription("Cheat externo para Roblox. No inyecta en el proceso, usa lectura de memoria.")
    .addFields(
      { name: "📡  Estado", value: statusField + (version ? `\n🔄 Versión Roblox: \`${version}\`` : ""), inline: false },
      {
        name: "👁️  ESP",
        value:
          "• Cajas (bounding box)\n• Esqueleto / Stickman\n• Nombres + Distancia\n• Barra de vida\n" +
          "• Snaplines\n• Chams (glow outline)\n• Colores: Default, Rojo, Azul, Naranja, Verde, Rainbow\n" +
          "• Filtro de equipo\n• Filtro de usuarios específicos",
        inline: false
      },
      {
        name: "🎯  Aimbot",
        value:
          "• Tecla configurable\n• Suavizado ajustable (sin rebote)\n• Hueso objetivo: Cabeza / Cuello / Pecho\n" +
          "• FOV ajustable con círculo visual\n• Distancia máxima configurable\n• Predicción de movimiento\n" +
          "• Filtro de equipo\n• Filtro de usuarios específicos",
        inline: false
      },
      {
        name: "⚡  Extras",
        value:
          "• **Triggerbot** — disparo automático al apuntar\n• **Bunny Hop** — salto automático\n" +
          "• **Radar** — mini-mapa con enemigos\n• **Crosshair** — mira personalizada (3 estilos)\n" +
          "• **Hitmarker** — indicador de impacto\n• **Killfeed** — registro de eliminaciones\n" +
          "• **Anti-AFK** — evita que Roblox te saque por inactividad\n• **Anti-Flash / Anti-Smoke**",
        inline: false
      },
      {
        name: "🕹️  Modos de juego",
        value: "General • Counterblox • Duels • Arsenal • Rivals\n_(configuración independiente por modo)_",
        inline: false
      },
      {
        name: "⌨️  Teclas por defecto",
        value: "• `INSERT` — abrir/cerrar panel\n• `END` — Panic (oculta todo)\n• `X` — activar aimbot",
        inline: false
      },
      {
        name: "📦  Instalación",
        value:
          "1. Descargá el ZIP y extraelo con contraseña: **ceitus**\n" +
          "2. Ejecutá `RbxESP.exe`\n3. Ingresá tu key de acceso\n4. Abrí Roblox y jugá",
        inline: false
      }
    )
    .setFooter({ text: "Ceitus • Solo para uso personal • No compartas tu key" })
    .setTimestamp();

  return embed;
}

async function updateInfoEmbed(client, status, version) {
  const state = loadState();
  if (!state.channelId || !state.messageId) return;

  saveState({ status, ...(version ? { version } : {}) });

  try {
    const channel = await client.channels.fetch(state.channelId);
    const message = await channel.messages.fetch(state.messageId);
    await message.edit({ embeds: [buildInfoEmbed(status, version ?? state.version)] });
    console.log(`[info-panel] Embed actualizado → ${status}`);
  } catch (e) {
    console.error("[info-panel] Error editando embed:", e.message);
  }
}

module.exports = { loadState, saveState, buildInfoEmbed, updateInfoEmbed };
