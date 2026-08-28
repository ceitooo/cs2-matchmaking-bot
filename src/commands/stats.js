const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreatePlayer } = require("../db/database");

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

    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats de ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: "ELO", value: `${player.elo}`, inline: true },
        { name: "Victorias", value: `${player.wins}`, inline: true },
        { name: "Derrotas", value: `${player.losses}`, inline: true },
        { name: "Winrate", value: `${winrate}%`, inline: true },
        { name: "Steam", value: player.steam_id ? "Vinculado ✅ — usa `/steam-stats`" : "No vinculado — usa `/vincular-steam`", inline: true }
      );

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
