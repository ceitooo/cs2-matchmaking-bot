require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const category = channels.find((c) => c.type === ChannelType.GuildCategory && c.name.includes("EMPAREJAMIENTOS CS2"));

    const verifyChannel = await guild.channels.create({
      name: "✅・verificar-steam",
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      position: 0,
      topic: "Vincula tu cuenta de Steam para poder jugar. Obligatorio antes de unirte a la cola.",
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("🎮 Verifica tu cuenta de Steam")
      .setColor(0x1b2838)
      .setThumbnail("https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg")
      .setDescription(
        "Antes de poder unirte a las colas de matchmaking necesitas vincular tu cuenta de Steam.\n\n" +
        "Esto evita cuentas falsas y asegura que tus estadísticas de CS2 sean reales.\n\n" +
        "**Pasos:**\n" +
        "1. Presiona el botón de abajo\n" +
        "2. Inicia sesión con tu cuenta de Steam\n" +
        "3. ¡Listo! Ya puedes unirte a la cola en <#" + "PANEL_CHANNEL_PLACEHOLDER" + ">"
      )
      .setFooter({ text: "Tu enlace es personal y expira en 10 minutos" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("steam_verify").setLabel("Vincular mi Steam").setStyle(ButtonStyle.Primary).setEmoji("🔗")
    );

    const panelChannel = channels.find((c) => c.name === "📋・panel-partidas");
    const finalEmbed = EmbedBuilder.from(embed).setDescription(
      embed.data.description.replace("PANEL_CHANNEL_PLACEHOLDER", panelChannel ? panelChannel.id : "")
    );

    await verifyChannel.send({ embeds: [finalEmbed], components: [row] });

    console.log(`Canal creado: ${verifyChannel.name} (${verifyChannel.id})`);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
