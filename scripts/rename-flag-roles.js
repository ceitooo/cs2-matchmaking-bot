require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const RENAMES = {
  "1543905244910587934": "Argentina",
  "1543905247364124722": "Brasil",
  "1543905248857563207": "Perú",
  "1543905250883412060": "Chile",
  "1543905252485505106": "Paraguay",
  "1543905254133735455": "Europa",
  "1543905255626899520": "América / EEUU",
  "1543905259083276298": "Español",
  "1543905261180428359": "Inglés",
  "1543905262946226256": "Portugués",
  "1543905264326156368": "Japonés"
};

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.roles.fetch();

    for (const [roleId, newName] of Object.entries(RENAMES)) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.log(`No encontré el rol ${roleId}`);
        continue;
      }
      await role.setName(newName);
      console.log(`Renombrado: ${role.id} -> ${newName}`);
    }

    console.log("Listo.");
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
