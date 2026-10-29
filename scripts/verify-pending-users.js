require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Client, GatewayIntentBits } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID || "1339090100424019978";
const VERIFIED_ROLE_ID = "1563952522463543380";
const USER_ROLE_ID = "1339103137901969439";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once("clientReady", async () => {
  try {
    console.log(`[verify-script] Bot conectado como: ${client.user.tag}`);
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
      console.error(`[verify-script] No se encontró el servidor ${GUILD_ID}`);
      process.exit(1);
    }

    const verifiedRole = await guild.roles.fetch(VERIFIED_ROLE_ID);
    const userRole = await guild.roles.fetch(USER_ROLE_ID);

    if (!verifiedRole || !userRole) {
      console.error("[verify-script] No se encontraron los roles Verified o User");
      process.exit(1);
    }

    console.log(`[verify-script] Rol Verified: "${verifiedRole.name}" (${verifiedRole.id})`);
    console.log(`[verify-script] Rol User: "${userRole.name}" (${userRole.id})`);

    await guild.members.fetch();
    console.log(`[verify-script] Miembros en cache: ${guild.members.cache.size}`);

    // Identificar usuarios en verify (que no tienen Verified ni User, o que tienen Verified pero les falta User)
    const targets = [];
    guild.members.cache.forEach((member) => {
      if (member.user.bot) return;
      const hasVerified = member.roles.cache.has(VERIFIED_ROLE_ID);
      const hasUser = member.roles.cache.has(USER_ROLE_ID);

      if (!hasVerified || !hasUser) {
        // Principalmente los que están en canal verify (sin roles) y los que tienen uno solo
        targets.push({ member, hasVerified, hasUser });
      }
    });

    console.log(`[verify-script] Encontrados ${targets.length} usuarios para actualizar roles.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const { member, hasVerified, hasUser } = targets[i];
      const rolesToAdd = [];
      if (!hasVerified) rolesToAdd.push(VERIFIED_ROLE_ID);
      if (!hasUser) rolesToAdd.push(USER_ROLE_ID);

      try {
        await member.roles.add(rolesToAdd, "Verificación automática de usuarios en canal verify");
        successCount++;
        console.log(`[${i + 1}/${targets.length}] Roles asignados a ${member.user.tag} (${member.id}) (+${rolesToAdd.length} roles)`);
      } catch (err) {
        failCount++;
        console.error(`[${i + 1}/${targets.length}] Error con ${member.user.tag}: ${err.message}`);
      }

      // Pausa de 350ms para no saturar rate limit de Discord REST
      await new Promise((r) => setTimeout(r, 350));
    }

    console.log(`\n===========================================`);
    console.log(`[verify-script] Proceso finalizado:`);
    console.log(` - Éxitos: ${successCount}`);
    console.log(` - Fallos: ${failCount}`);
    console.log(`===========================================`);
  } catch (err) {
    console.error("[verify-script] Error general:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
