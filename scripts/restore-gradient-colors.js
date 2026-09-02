require("dotenv").config();
const { Client, GatewayIntentBits, AuditLogEvent } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const HOLOGRAPHIC_TERTIARY = 16761760;

function hexToHsl(hex) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toByte = (v) => Math.round((v + m) * 255);
  return (toByte(r) << 16) + (toByte(g) << 8) + toByte(b);
}

function secondaryFor(primaryColor) {
  if (primaryColor === 0) return 0x5865f2; // default sin color: usamos el blurple como segundo tono
  const { h, s, l } = hexToHsl(primaryColor);
  const boostedS = Math.min(1, s + 0.15);
  const boostedL = Math.min(0.75, l + 0.15);
  return hslToHex(h + 35, boostedS, boostedL);
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.roles.fetch();

    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 100 });
    const originalColors = new Map();

    for (const entry of logs.entries.values()) {
      const colorsChange = entry.changes?.find((c) => c.key === "colors");
      if (!colorsChange) continue;
      if (colorsChange.new?.tertiary_color !== HOLOGRAPHIC_TERTIARY) continue; // solo nuestros cambios de recién
      if (!entry.targetId) continue;
      if (originalColors.has(entry.targetId)) continue; // nos quedamos con la más reciente (más cercana al color real)

      originalColors.set(entry.targetId, colorsChange.old?.primary_color ?? 0);
    }

    console.log(`Encontré color original de ${originalColors.size} roles en el audit log.`);

    let ok = 0;
    let failed = 0;

    for (const [roleId, primaryColor] of originalColors) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      const secondaryColor = secondaryFor(primaryColor);

      try {
        await role.setColors({ primaryColor, secondaryColor });
        console.log(`OK: ${role.name} (#${primaryColor.toString(16)} -> #${secondaryColor.toString(16)})`);
        ok++;
      } catch (e) {
        console.log(`FALLÓ: ${role.name} -> ${e.message}`);
        failed++;
      }
    }

    console.log(`\nListo. ${ok} restaurados con degradado de 2 colores, ${failed} con error.`);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
