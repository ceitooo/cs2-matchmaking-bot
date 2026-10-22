require('dotenv').config({ path: 'C:/Users/holad/BOTDISCORD/ceitus-bot/.env' });
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const USER_ROLE_ID = '1339103137901969439'; // "User"
const GIF_ROLE_ID = '1422305716890370048';  // "gif"

client.once('clientReady', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    console.log(`Guild: ${guild.name}`);

    const botMember = await guild.members.fetch(client.user.id);
    console.log(`Bot highest role position: ${botMember.roles.highest.position} (${botMember.roles.highest.name})`);

    const gifRole = await guild.roles.fetch(GIF_ROLE_ID);
    console.log(`gif role position: ${gifRole.position}`);

    if (botMember.roles.highest.position <= gifRole.position) {
      console.error(`ERROR: Bot role position (${botMember.roles.highest.position}) must be HIGHER than gif role position (${gifRole.position}) to assign it!`);
      return;
    }

    console.log('Fetching all guild members...');
    const members = await guild.members.fetch();
    console.log(`Total members in guild: ${members.size}`);

    const targetMembers = members.filter(m => m.roles.cache.has(USER_ROLE_ID));
    console.log(`Members with "User" role: ${targetMembers.size}`);

    let assigned = 0;
    let alreadyHad = 0;
    let failed = 0;

    for (const [id, member] of targetMembers) {
      if (member.roles.cache.has(GIF_ROLE_ID)) {
        alreadyHad++;
        console.log(`[ALREADY] ${member.user.tag} already has the "gif" role.`);
      } else {
        try {
          await member.roles.add(gifRole, 'Asignación masiva a usuarios con rol User');
          assigned++;
          console.log(`[ASSIGNED] Added "gif" role to ${member.user.tag} (${member.id})`);
          // Delay to respect rate limits
          await new Promise(r => setTimeout(r, 600));
        } catch (e) {
          failed++;
          console.error(`[FAILED] Could not add role to ${member.user.tag}: ${e.message}`);
        }
      }
    }

    console.log(`\nFinished:`);
    console.log(`- Roles asignados: ${assigned}`);
    console.log(`- Ya lo tenían: ${alreadyHad}`);
    console.log(`- Fallidos: ${failed}`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
