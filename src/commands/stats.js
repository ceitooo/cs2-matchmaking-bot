const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreatePlayer } = require("../db/database");

function computeBadges(player) {
  const badges = [];
  if (player.steam_id) badges.push("✅ Steam Verificado");
  if (player.lobbies_created >= 1) badges.push("🎬 Anfitrión");
  if (player.lobbies_created >= 5) badges.push("🎥 Anfitrión Frecuente");
  if (player.lobbies_played >= 1) badges.push("🎮 Primera Partida");
  if (player.lobbies_played >= 10) badges.push("🔥 Jugador Activo");
  if (player.lobbies_played >= 50) badges.push("🏅 Veterano");
  return badges;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Muestra tus estadísticas del servidor (ELO, victorias, derrotas)")
    .addUserOption((opt) => opt.setName("jugador").setDescription("Ver stats de otro jugador").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("jugador") ?? interaction.user;
    const player = getOrCreatePlayer(target.id, target.username);

    const total = player.wins + player.losses;
    const winrate = total > 0 ? ((player.wins / total) * 100).toFixed(1) : "0.0";
    const badges = computeBadges(player);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats de ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: "ELO", value: `${player.elo}`, inline: true },
        { name: "Victorias", value: `${player.wins}`, inline: true },
        { name: "Derrotas", value: `${player.losses}`, inline: true },
        { name: "Winrate", value: `${winrate}%`, inline: true },
        { name: "Salas jugadas", value: `${player.lobbies_played}`, inline: true },
        { name: "Salas creadas", value: `${player.lobbies_created}`, inline: true },
        { name: "Steam", value: player.steam_id ? "Vinculado ✅ — usa `/steam-stats`" : "No vinculado — usa `/vincular-steam`", inline: true }
      );

    if (badges.length) {
      embed.addFields({ name: "🏆 Insignias", value: badges.join("\n") });
    }

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
