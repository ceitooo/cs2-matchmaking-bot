require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Client, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID || "1339090100424019978";
const STAFF_ROLE_NAMES = /^(staff|ceito|developer|founder|admin|administrador|moderador|pre-staff)$/i;
const KNOWN_STAFF_ROLE_IDS = new Set([
  "1339092743569539144", // Staff (Ceitus)
  "1339092538413551686", // Ceito
  "1487999355876278452", // Developer
  "1562938605029171332"  // Pre-staff
]);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    console.log(`[permisos] Conectado a guild: ${guild.name} (${guild.id})`);

    // 1. Asegurar que @everyone no tenga permiso de cambiar apodo
    const everyone = guild.roles.everyone;
    if (everyone.permissions.has(PermissionFlagsBits.ChangeNickname)) {
      await everyone.setPermissions(everyone.permissions.remove(PermissionFlagsBits.ChangeNickname));
      console.log("[permisos] ✅ Permiso 'Cambiar apodo' removido de @everyone");
    } else {
      console.log("[permisos] ℹ️ @everyone ya tenía 'Cambiar apodo' desactivado");
    }

    // 2. Revisar roles no staff y remover ChangeNickname si lo tienen
    await guild.roles.fetch();
    let modCount = 0;
    for (const role of guild.roles.cache.values()) {
      if (role.id === everyone.id) continue;
      if (role.managed) continue; // roles de bots/integraciones
      if (role.permissions.has(PermissionFlagsBits.Administrator)) continue;

      const isStaff = KNOWN_STAFF_ROLE_IDS.has(role.id) || STAFF_ROLE_NAMES.test(role.name.trim());
      if (!isStaff && role.permissions.has(PermissionFlagsBits.ChangeNickname)) {
        await role.setPermissions(role.permissions.remove(PermissionFlagsBits.ChangeNickname));
        console.log(`[permisos] ✅ Permiso 'Cambiar apodo' removido del rol no-staff: ${role.name} (${role.id})`);
        modCount++;
      }
    }

    // 3. Asegurar que el rol Staff sí tenga permiso de cambiar apodo
    const staffRole = guild.roles.cache.get("1339092743569539144") || guild.roles.cache.find(r => r.name.toLowerCase() === "staff");
    if (staffRole && !staffRole.permissions.has(PermissionFlagsBits.ChangeNickname)) {
      await staffRole.setPermissions(staffRole.permissions.add(PermissionFlagsBits.ChangeNickname));
      console.log(`[permisos] ✅ Permiso 'Cambiar apodo' asegurado en el rol Staff (${staffRole.name})`);
    }

    console.log(`[permisos] Finalizado. Roles modificados: ${modCount}`);
  } catch (err) {
    console.error("[permisos] Error aplicando permisos:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
