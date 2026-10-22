require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once("clientReady", async () => {
  for (const g of client.guilds.cache.values()) {
    const chans = await g.channels.fetch();
    for (const c of chans.values()) {
      if (!c || !/firma|general/i.test(c.name)) continue;
      console.log(`\n[${g.name}] #${c.name} (${c.id}) parent=${c.parent?.name} synced=${c.permissionsLocked}`);
      for (const o of c.permissionOverwrites.cache.values()) {
        const who = g.roles.cache.get(o.id)?.name ?? `user ${o.id}`;
        console.log(`  ${who}: allow=[${new PermissionsBitField(o.allow).toArray()}] deny=[${new PermissionsBitField(o.deny).toArray()}]`);
      }
      const ev = c.permissionsFor(g.roles.everyone);
      console.log(`  @everyone efectivo: send=${ev.has("SendMessages")} attach=${ev.has("AttachFiles")} embed=${ev.has("EmbedLinks")}`);
    }
    const ev = g.roles.everyone.permissions;
    console.log(`[${g.name}] @everyone base: attach=${ev.has("AttachFiles")} embed=${ev.has("EmbedLinks")}`);
  }
  client.destroy();
});
client.login(process.env.DISCORD_TOKEN);
