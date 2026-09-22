const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { updatePanel, fetchRobloxVersion } = require("../sales/robloxChecker");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("onceitusroblox")
    .setDescription("Reactiva Ceitus Roblox External y anuncia en el servidor.")
    .addChannelOption((o) =>
      o.setName("anuncios").setDescription("Canal donde anunciar (default: canal configurado)").setRequired(false)
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff puede usar este comando.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const settings = getGuildSettings(guild.id);

    // Obtener versión actual de Roblox
    let version = settings.roblox_last_version;
    try {
      version = await fetchRobloxVersion();
    } catch {}

    // Actualizar estado a activo
    updateGuildSettings(guild.id, {
      roblox_panel_status: "activo",
      roblox_last_version: version
    });

    // Actualizar el panel
    await updatePanel(guild, {
      ...settings,
      roblox_panel_status: "activo",
      roblox_last_version: version
    });

    // Canal de anuncios: el pasado en el comando, o el configurado, o el de actualizaciones
    const announceCh =
      interaction.options.getChannel("anuncios") ??
      (settings.roblox_announce_channel_id
        ? await guild.channels.fetch(settings.roblox_announce_channel_id).catch(() => null)
        : null) ??
      (settings.roblox_updates_channel_id
        ? await guild.channels.fetch(settings.roblox_updates_channel_id).catch(() => null)
        : null);

    if (announceCh?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle("🟢 Ceitus Roblox External — ACTIVO")
        .setColor(0x2ecc71)
        .setDescription(
          `✅ **Ceitus Roblox External ya está activo** y actualizado para la nueva versión de Roblox.\n\n` +
          `🔄 **Versión Roblox:** \`${version ?? "desconocida"}\`\n\n` +
          `Podés comprar tu acceso en <#${settings.roblox_panel_channel_id ?? "el canal de ventas"}> 🛒`
        )
        .setTimestamp();
      await announceCh.send({ embeds: [embed] });
    }

    await interaction.editReply({
      content: `✅ Panel reactivado${version ? ` para versión \`${version}\`` : ""}${announceCh ? ` y anunciado en ${announceCh}` : ""}.`
    });
  }
};
