require("dotenv").config();
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");

const CHANNEL_ID = "1339335392947736576";
const MESSAGE_ID = "1563310366560100422";
const ICON_PATH = path.resolve("C:/Users/holad/app de optimizacion/ceitotweaks/icon.png");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once("clientReady", async () => {
  console.log(`[update-panel] Bot conectado como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const msg = await channel.messages.fetch(MESSAGE_ID);

    const embed = new EmbedBuilder()
      .setTitle("⚡ CEITOTWEAKS — Optimización Todo-en-Uno para tu PC")
      .setDescription(
        "**CeitoTweaks** es la herramienta definitiva para Windows diseñada para exprimir cada FPS, estabilizar tu conexión y reducir la latencia de tu sistema al mínimo absoluto."
      )
      .setColor(0x7c5cff)
      .setThumbnail("attachment://icon.png")
      .addFields(
        {
          name: "⚡ OPTIMIZACIÓN Y RENDIMIENTO",
          value: [
            "• **+370 Tweaks profesionales:** ordenados por categoría con nivel de riesgo (Seguro, Precaución, Riesgoso) y reversión 100% limpia en un clic.",
            "• **Perfiles en 1 Clic:** Competitivo, Streaming o Notebook optimizados al instante.",
            "• **Modo Juego Automático:** prioridad alta, plan de energía al máximo, silenciado de Windows y cierre de procesos pesados de fondo con detector automático de juegos en ejecución.",
            "• **Planes de Energía Ceito:** perfiles balanceados y agresivos diseñados para el menor input delay.",
            "• **Red y WiFi:** WiFi sin ahorro de energía, DNS ultrarrápidos, MTU y Ethernet a 1 Gbps.",
            "• **Optimizar Apps:** Discord, Chrome, Spotify, Steam y Edge sin procesos residuales ni aceleración que consuma GPU."
          ].join("\n")
        },
        {
          name: "🎮 EXTRAS PARA GAMING & HERRAMIENTAS",
          value: [
            "• **CeitoClip (Clips por GPU):** grabá los últimos 30s/60s de tus mejores jugadas con NVENC/AMF sin caídas de FPS ni marcas de agua.",
            "• **CeitoSound:** modulador de voz en vivo con supresión de ruido por IA para tu micrófono.",
            "• **CeitoAim (Arena 1v1):** entrená tu puntería, competí en duelos en tiempo real, ganá monedas y desbloqueá skins y cuchillos exclusivos.",
            "• **CeitoBoard:** overlay interactivo de pulsaciones de teclado y mouse en pantalla para jugar o streamear.",
            "• **Filtro de Pantalla Permanente:** calibrá colores, gamma y saturación digital. Ahora podés dejarlo activo al cerrar la app o controlarlo desde la bandeja del sistema.",
            "• **Biblioteca Universal:** compatibilidad nativa con Steam, Epic, Riot, Xbox Game Pass, Roblox y Minecraft Launcher."
          ].join("\n")
        },
        {
          name: "🔍 DIAGNÓSTICOS, MANTENIMIENTO & APPS",
          value: [
            "• **Gráfica de rendimiento en vivo:** lectura real de CPU, GPU y RAM idéntica al Administrador de tareas.",
            "• **Detector de Cuello de Botella:** salud del sistema, drivers obsoletos y prueba de latencia DPC.",
            "• **Limpieza y Reparación:** temporales, caché de shaders DirectX/NVIDIA y reparación SFC + DISM.",
            "• **Desinstalador Inteligente:** detección de restos en registro y escaneo con Windows Defender.",
            "• **+180 Apps con 1 Clic:** Timer Resolution, ISLC, navegadores y plugins como xCord (Nitro gratis vía Vencord)."
          ].join("\n")
        },
        {
          name: "✨ PERFIL, COMUNIDAD & RECOMPENSAS",
          value: [
            "• **Buscador Global en Inicio:** encontrá cualquier tweak o herramienta escribiendo en la barra de búsqueda.",
            "• **Personalización de Perfil:** fotos, banners recortables, efectos Premium (arcoíris, brillo, glitch) y contador de likes.",
            "• **Buzón Comunitario:** recibí regalos, monedas, keys, anuncios y notificaciones en tu app.",
            "• **Modos Community:** compartí y votá configuraciones con soporte en 7 idiomas."
          ].join("\n")
        }
      )
      .setFooter({ text: "CeitoTweaks v1.17.8 • Desarrollado para máximo rendimiento" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("📥 Descargar CeitoTweaks v1.17.8")
        .setStyle(ButtonStyle.Link)
        .setURL("https://github.com/ceitooo/ceitotweaks/releases/latest"),
      new ButtonBuilder()
        .setLabel("🌐 Web Oficial")
        .setStyle(ButtonStyle.Link)
        .setURL("https://ceitotweaks.com/"),
      new ButtonBuilder()
        .setLabel("💬 Soporte Discord")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/ceitus")
    );

    await msg.edit({
      embeds: [embed],
      components: [row]
    });

    console.log(`[update-panel] Panel actualizado con éxito a +370 tweaks!`);
  } catch (err) {
    console.error("[update-panel] Error editando panel:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
