require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { updateGuildSettings } = require("../src/db/database");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const GROUPS = {
  notif: {
    mentionable: true,
    roles: [
      { key: "ping_sorteos", name: "🔔 Ping Sorteos" },
      { key: "ping_productos", name: "🛒 Ping Productos" },
      { key: "ping_anuncios", name: "📢 Ping Anuncios" },
      { key: "cs2", name: "🎮 CS2 / Matchmaking" }
    ]
  },
  region: {
    mentionable: false,
    roles: [
      { key: "ar", name: "🇦🇷 Argentina" },
      { key: "br", name: "🇧🇷 Brasil" },
      { key: "pe", name: "🇵🇪 Perú" },
      { key: "cl", name: "🇨🇱 Chile" },
      { key: "py", name: "🇵🇾 Paraguay" },
      { key: "eu", name: "🇪🇺 Europa" },
      { key: "us", name: "🇺🇸 América / EEUU" },
      { key: "asia", name: "🌏 Asia" }
    ]
  },
  language: {
    mentionable: false,
    roles: [
      { key: "es", name: "🇪🇸 Español" },
      { key: "en", name: "🇬🇧 Inglés" },
      { key: "pt", name: "🇵🇹 Portugués" },
      { key: "ja", name: "🇯🇵 Japonés" },
      { key: "other", name: "🌐 Otro idioma" }
    ]
  },
  age: {
    mentionable: false,
    roles: [
      { key: "minor", name: "🧒 -18" },
      { key: "adult", name: "🔞 +18" }
    ]
  }
};

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.roles.fetch();

    const selfRolesJson = {};

    for (const [groupKey, group] of Object.entries(GROUPS)) {
      selfRolesJson[groupKey] = [];
      for (const roleDef of group.roles) {
        let role = guild.roles.cache.find((r) => r.name === roleDef.name);
        if (!role) {
          role = await guild.roles.create({ name: roleDef.name, mentionable: group.mentionable, hoist: false });
          console.log(`Rol creado: ${role.name} (${role.id})`);
        } else {
          console.log(`Rol ya existía: ${role.name} (${role.id})`);
        }
        selfRolesJson[groupKey].push({ key: roleDef.key, roleId: role.id, label: roleDef.name });
      }
    }

    updateGuildSettings(guild.id, { self_roles_json: JSON.stringify(selfRolesJson) });
    console.log("Listo. IDs de roles guardados para usarlos después en el panel de self-roles.");
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
