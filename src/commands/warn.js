const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addWarn, getWarns, removeWarn, getGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

async function logWarn(interaction, settings, text) {
  if (!settings.log_warns_channel_id) return;
  const channel = await interaction.guild.channels.fetch(settings.log_warns_channel_id).catch(() => null);
  if (channel?.isTextBased()) await channel.send(text).catch(() => {});
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Sistema de advertencias")
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Agrega una advertencia a un usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Motivo de la advertencia").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("quitar")
        .setDescription("Elimina una advertencia por su ID")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la advertencia (ver /warn lista)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("lista")
        .setDescription("Muestra las advertencias de un usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const settings = getGuildSettings(interaction.guild.id);

    if (sub === "agregar") {
      const usuario = interaction.options.getUser("usuario");
      const razon = interaction.options.getString("razon");
      const warn = addWarn(interaction.guild.id, usuario.id, interaction.user.id, razon);
      const total = getWarns(interaction.guild.id, usuario.id).length;

      await interaction.reply({ content: `⚠️ Advertencia #${warn.id} agregada a ${usuario} (total: ${total}).`, flags: 64 });

      await usuario
        .send(`⚠️ Recibiste una advertencia en **${interaction.guild.name}**.\nMotivo: ${razon}`)
        .catch(() => {});

      await logWarn(
        interaction,
        settings,
        `⚠️ **Warn #${warn.id}** — ${usuario.tag} (${usuario.id})\nModerador: ${interaction.user.tag}\nMotivo: ${razon}\nTotal de warns: ${total}`
      );
      return;
    }

    if (sub === "quitar") {
      const id = interaction.options.getInteger("id");
      const result = removeWarn(interaction.guild.id, id);
      if (result.changes === 0) {
        return interaction.reply({ content: `❌ No existe la advertencia #${id}.`, flags: 64 });
      }
      await interaction.reply({ content: `✅ Advertencia #${id} eliminada.`, flags: 64 });
      await logWarn(interaction, settings, `🗑️ **Warn #${id}** eliminado por ${interaction.user.tag}`);
      return;
    }

    if (sub === "lista") {
      const usuario = interaction.options.getUser("usuario");
      const warns = getWarns(interaction.guild.id, usuario.id);

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Advertencias de ${usuario.username}`)
        .setColor(0xf1c40f)
        .setThumbnail(usuario.displayAvatarURL());

      if (warns.length === 0) {
        embed.setDescription("Este usuario no tiene advertencias.");
      } else {
        embed.setDescription(
          warns
            .map((w) => `**#${w.id}** — <@${w.moderator_id}> — <t:${Math.floor(w.created_at / 1000)}:short>\n${w.reason}`)
            .join("\n\n")
        );
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
