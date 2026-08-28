require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getVerifyStartUrl } = require("../src/steam/server");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const verifyChannel = channels.find((c) => c.type === ChannelType.GuildText && c.name === "✅・verificar-steam");
    if (!verifyChannel) {
      console.log("No se encontró el canal de verificación.");
      return;
    }

    const panelChannel = channels.find((c) => c.name === "📋・panel-partidas");

    const embed = new EmbedBuilder()
      .setTitle("🎮 Verifica tu cuenta de Steam")
      .setColor(0x1b2838)
      .setThumbnail("https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg")
      .setDescription(
        "Antes de poder unirte a las colas de matchmaking necesitas vincular tu cuenta de Steam.\n\n" +
        "Esto evita cuentas falsas y asegura que tus estadísticas de CS2 sean reales.\n\n" +
        "Presiona el botón de abajo — te llevará directo a iniciar sesión, sin pasos extra.\n\n" +
        `Cuando termines podrás unirte a la cola en <#${panelChannel ? panelChannel.id : ""}>`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Vincular mi Steam").setStyle(ButtonStyle.Link).setURL(getVerifyStartUrl()).setEmoji("🔗")
    );

    const messages = await verifyChannel.messages.fetch({ limit: 10 });
    const botMessage = messages.find((m) => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit({ embeds: [embed], components: [row] });
      console.log("Mensaje actualizado.");
    } else {
      await verifyChannel.send({ embeds: [embed], components: [row] });
      console.log("Mensaje nuevo enviado (no había uno previo del bot).");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
