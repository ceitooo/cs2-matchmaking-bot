const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const PUBLIC_CATEGORIES = [
  {
    name: "🎮 Matchmaking",
    commands: [
      "`/stats` — tus estadísticas de ELO",
      "`/steam-stats` — tus stats de CS2",
      "`/vincular-steam` — vinculá tu cuenta de Steam",
      "`/perfil` — tu perfil de comunidad"
    ]
  },
  {
    name: "🏆 Niveles",
    commands: ["`/rank` — tu tarjeta de nivel y XP"]
  },
  {
    name: "😴 Utilidad",
    commands: ["`/afk` — marcate como AFK con un motivo", "`/recordarme` — recordatorio personal por DM", "`/traducir` — traducí cualquier texto"]
  },
  {
    name: "🎨 Imágenes divertidas",
    commands: [
      "`/magik`, `/deepfry`, `/jail` — distorsiona un avatar",
      "`/trigger`, `/triggered`, `/spin`, `/rainbow` — gifs animados",
      "`/wanted`, `/wasted`, `/rip` — carteles con el avatar",
      "`/petpet` — GIF acariciando el avatar",
      "`/shipeo` — compatibilidad entre dos personas",
      "`/slap`, `/kiss`, `/hug`, `/pat` — reacciones con gif",
      "`/aura`, `/cat` — gifs random"
    ]
  },
  {
    name: "🎲 Diversión",
    commands: ["`/8ball` — preguntale a la bola 8", "`/dado`, `/moneda` — random rápido"]
  }
];

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Lista todos los comandos disponibles"),

  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle("📖 Comandos disponibles").setColor(0x5865f2).setDescription("Comandos que cualquiera puede usar:");

    for (const category of PUBLIC_CATEGORIES) {
      embed.addFields({ name: category.name, value: category.commands.join("\n") });
    }

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
