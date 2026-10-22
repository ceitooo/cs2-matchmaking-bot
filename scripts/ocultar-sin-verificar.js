// Oculta a los que no se verificaron (solo @everyone) los canales que se les
// filtraban, y se los deja visibles al rol User, igual que el resto del server.
// Solo toca ViewChannel; el resto de los permisos de cada canal queda igual.
const BOT = require('path').join(__dirname, '..');
require(BOT + '/node_modules/dotenv').config({ path: BOT + '/.env' });
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits: P } = require(BOT + '/node_modules/discord.js');

const USER_ROLE_ID = '1339103137901969439';
// Los únicos que tiene que ver alguien sin verificar.
const PUBLICOS = new Set(['rules', '✅・verify', '🆘︱soporte']);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const chans = await guild.channels.fetch();
    const everyone = guild.roles.everyone;
    const userRole = guild.roles.cache.get(USER_ROLE_ID);
    if (!userRole) throw new Error('no existe el rol User');
    const veSinVerificar = (ch) => {
      let bits = everyone.permissions.bitfield;
      const e = ch.permissionOverwrites.cache.get(everyone.id);
      if (e) bits = (bits & ~e.deny.bitfield) | e.allow.bitfield;
      return !!(bits & P.ViewChannel);
    };
    for (const ch of chans.values()) {
      if (!ch || ch.type === ChannelType.GuildCategory || PUBLICOS.has(ch.name)) continue;
      if (!veSinVerificar(ch)) continue;
      await ch.permissionOverwrites.edit(userRole.id, { ViewChannel: true }, { reason: 'Solo verificados' });
      await ch.permissionOverwrites.edit(everyone.id, { ViewChannel: false }, { reason: 'Solo verificados' });
      console.log('oculto para no verificados:', ch.name);
    }
  } catch (e) { console.error('ERROR', e.message); }
  client.destroy(); process.exit(0);
});
client.login(process.env.DISCORD_TOKEN);
