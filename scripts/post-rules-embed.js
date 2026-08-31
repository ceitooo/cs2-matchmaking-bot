require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channel = await guild.channels.fetch("1339091806180216884");

    const oldMsg = await channel.messages.fetch("1543055476307136592").catch(() => null);
    if (oldMsg) await oldMsg.delete().catch(() => {});

    const attachment = new AttachmentBuilder("C:/Users/holad/Downloads/rules.gif", { name: "rules.gif" });

    const embed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setImage("attachment://rules.gif")
      .setDescription(
        `# 📜 Reglas del Servidor

## 1️⃣  Respeto ante todo
> Trata a todos los miembros con respeto. No se toleran insultos, acoso, hate speech ni discriminación de ningún tipo.

## 2️⃣  Sin spam ni flood
> Evita mensajes repetitivos, mayúsculas excesivas, menciones masivas o spam de enlaces/emojis.

## 3️⃣  Contenido adecuado
> No se permite contenido NSFW, violento, gore ni que infrinja las normas de Discord. El server es para todas las edades.

## 4️⃣  Usa cada canal para su propósito
> Revisa la descripción del canal antes de postear. Si tienes dudas, pregunta a un moderador.

## 5️⃣  No publicidad sin permiso
> Prohibido promocionar otros servidores, redes sociales, productos o servicios sin autorización del staff.

## 6️⃣  No suplantación ni cuentas alternativas
> No uses alts para evadir sanciones ni te hagas pasar por otro miembro o por el staff.

## 7️⃣  Nada de información personal
> Por tu seguridad, no compartas direcciones, teléfonos, contraseñas ni datos de otras personas sin su consentimiento.

## 8️⃣  Respeta las decisiones del staff
> Las decisiones de moderación son finales. Si no estás de acuerdo, habla en privado y con respeto.

## 9️⃣  No DMs no solicitados
> No envíes mensajes privados con publicidad, links o contenido no pedido a otros miembros.

-# El incumplimiento puede llevar a advertencias, muteos, expulsión o ban, según la gravedad.`
      );

    await channel.send({ embeds: [embed], files: [attachment] });
    console.log("Reglas publicadas como embed con gif.");
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
