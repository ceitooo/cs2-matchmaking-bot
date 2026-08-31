const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

const PRODUCTOS = {
  CeitoTweaks: { channel: "ceitotweaks-updates", role: "CeitoTweaks", color: 0x9b59b6 },
  Ceitotify: { channel: "ceitotify-updates", role: "Ceitotify", color: 0x2ecc71 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Publica una actualización de CeitoTweaks o Ceitotify (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("publicar")
        .setDescription("Publica un changelog")
        .addStringOption((o) =>
          o
            .setName("producto")
            .setDescription("Qué proyecto se actualizó")
            .setRequired(true)
            .addChoices({ name: "CeitoTweaks", value: "CeitoTweaks" }, { name: "Ceitotify", value: "Ceitotify" })
        )
        .addStringOption((o) => o.setName("version").setDescription("Ej: v1.4.0").setRequired(true))
        .addStringOption((o) => o.setName("cambios").setDescription("Qué cambió (podés usar saltos de línea)").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const producto = interaction.options.getString("producto");
    const version = interaction.options.getString("version");
    const cambios = interaction.options.getString("cambios");
    const config = PRODUCTOS[producto];

    const channel = interaction.guild.channels.cache.find((c) => c.name === config.channel);
    if (!channel?.isTextBased()) {
      return interaction.reply({ content: `❌ No encontré el canal #${config.channel}.`, flags: 64 });
    }

    const role = interaction.guild.roles.cache.find((r) => r.name === config.role);

    const embed = new EmbedBuilder()
      .setTitle(`🆕 ${producto} ${version}`)
      .setColor(config.color)
      .setDescription(cambios)
      .setFooter({ text: `Publicado por ${interaction.user.username}` })
      .setTimestamp();

    await channel.send({ content: role ? `${role}` : undefined, embeds: [embed] }).catch(() => {});

    return interaction.reply({ content: `✅ Changelog de **${producto} ${version}** publicado en ${channel}.`, flags: 64 });
  }
};
