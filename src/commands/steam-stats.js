const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreatePlayer } = require("../db/database");
const { fetchCs2Stats, fetchSteamProfile, fetchCs2PlaytimeMinutes, evaluateSmurfRisk } = require("../utils/steamStats");
const { fetchFaceitStats } = require("../utils/faceitStats");
const { fetchLeetifyStats } = require("../utils/leetifyStats");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("steam-stats")
    .setDescription("Muestra tus estadísticas reales de CS2 vía Steam")
    .addUserOption((opt) => opt.setName("jugador").setDescription("Ver stats de otro jugador").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("jugador") ?? interaction.user;
    const player = getOrCreatePlayer(target.id, target.username);

    if (!player.steam_id) {
      return interaction.reply({
        content: `${target.id === interaction.user.id ? "No tienes" : `${target.username} no tiene`} una cuenta de Steam vinculada. Usa \`/vincular-steam\`.`,
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    const [cs2Stats, profile, faceit, playtimeMinutes, leetify] = await Promise.all([
      fetchCs2Stats(player.steam_id),
      fetchSteamProfile(player.steam_id),
      fetchFaceitStats(player.steam_id),
      fetchCs2PlaytimeMinutes(player.steam_id),
      fetchLeetifyStats(player.steam_id).catch(() => null)
    ]);

    if (!cs2Stats && !leetify) {
      return interaction.editReply({
        content: "No se pudieron leer las stats de CS2. El perfil de Steam podría ser privado."
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Stats de CS2 — ${profile?.personaname ?? target.username}`)
      .setColor(0x1b2838)
      .setThumbnail(profile?.avatarfull ?? target.displayAvatarURL())
      .setURL(`https://steamcommunity.com/profiles/${player.steam_id}`)
      .setFooter({ text: "Datos públicos de Steam, FACEIT y Leetify" });

    if (leetify?.premierRating) {
      embed.setDescription(`**🏆 Premier Rating: ${leetify.premierRating.toLocaleString("es")}**`);
    }

    if (cs2Stats) {
      const kd = cs2Stats.deaths > 0 ? (cs2Stats.kills / cs2Stats.deaths).toFixed(2) : cs2Stats.kills.toFixed(2);
      const hsPercent = cs2Stats.kills > 0 ? ((cs2Stats.headshots / cs2Stats.kills) * 100).toFixed(1) : "0.0";

      embed.addFields({
        name: "🎯 Steam (histórico)",
        value:
          `Kills: **${cs2Stats.kills.toLocaleString("es")}** · Muertes: **${cs2Stats.deaths.toLocaleString("es")}** · K/D: **${kd}**\n` +
          `Victorias: **${cs2Stats.wins.toLocaleString("es")}** · MVPs: **${cs2Stats.mvps.toLocaleString("es")}** · HS: **${hsPercent}%**`
      });
    }

    if (leetify) {
      const parts = [];
      if (leetify.aimRating !== null) parts.push(`Aim: **${leetify.aimRating}**`);
      if (leetify.utilityRating !== null) parts.push(`Utility: **${leetify.utilityRating}**`);
      if (leetify.reactionTimeMs !== null) parts.push(`Reacción: **${leetify.reactionTimeMs}ms**`);

      const parts2 = [];
      if (leetify.kdRatio !== null) parts2.push(`K/D: **${leetify.kdRatio}**`);
      if (leetify.winRate !== null) parts2.push(`Win Rate: **${leetify.winRate}%**`);
      if (leetify.kast !== null) parts2.push(`KAST: **${leetify.kast}%**`);

      const parts3 = [];
      if (leetify.accuracy !== null) parts3.push(`Precisión: **${leetify.accuracy}%**`);
      if (leetify.sprayAccuracy !== null) parts3.push(`Spray: **${leetify.sprayAccuracy}%**`);
      if (leetify.counterStrafing !== null) parts3.push(`Counter-strafe: **${leetify.counterStrafing}%**`);

      const value = [parts.join(" · "), parts2.join(" · "), parts3.join(" · ")].filter(Boolean).join("\n");

      if (value) {
        embed.addFields({
          name: `📊 Leetify (últimas ${leetify.matchesPlayed ?? "N"} partidas 5v5)`,
          value
        });
      }
    }

    if (faceit) {
      embed.addFields({
        name: "⚡ FACEIT",
        value: `Nivel: **${faceit.level}** · ELO: **${faceit.elo}** · Región: ${faceit.region}${faceit.faceitUrl ? ` · [Perfil](${faceit.faceitUrl})` : ""}`
      });
    } else {
      embed.addFields({ name: "⚡ FACEIT", value: "No se encontró cuenta de FACEIT vinculada a este Steam." });
    }

    embed.addFields({
      name: "🔗 Ver más",
      value:
        `[Leetify](https://leetify.com/app/profile/${player.steam_id}) · ` +
        `[CS2Tracker](https://cs2tracker.gg/stats/${player.steam_id}) · ` +
        `[CSTracker](https://cstracker.gg/players/${player.steam_id})`
    });

    const smurfFlags = evaluateSmurfRisk(profile, playtimeMinutes);
    if (smurfFlags.length) {
      embed.addFields({ name: "⚠️ Señales de cuenta nueva", value: smurfFlags.join(", ") });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
