const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { setLevelRole, getLevelRoles, deleteLevelRole } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nivelrol")
    .setDescription("Asigna un rol automático al llegar a cierto nivel (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("asignar")
        .setDescription("Define qué rol se da al llegar a un nivel")
        .addIntegerOption((o) => o.setName("nivel").setDescription("Nivel que desbloquea el rol").setRequired(true).setMinValue(1))
        .addRoleOption((o) => o.setName("rol").setDescription("Rol a dar").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista los roles por nivel configurados"))
    .addSubcommand((sub) =>
      sub.setName("quitar").setDescription("Elimina la asignación de un nivel").addIntegerOption((o) => o.setName("nivel").setDescription("Nivel a desconfigurar").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "asignar") {
      const nivel = interaction.options.getInteger("nivel");
      const rol = interaction.options.getRole("rol");
      setLevelRole(guildId, nivel, rol.id);
      return interaction.reply({ content: `✅ Al llegar a **nivel ${nivel}** ahora se da el rol ${rol}.`, flags: 64 });
    }

    if (sub === "listar") {
      const roles = getLevelRoles(guildId);
      if (roles.length === 0) {
        return interaction.reply({ content: "📭 No hay roles por nivel configurados.", flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setTitle("🏆 Roles por nivel")
        .setColor(0x9b59b6)
        .setDescription(roles.map((r) => `**Nivel ${r.level}** → <@&${r.role_id}>`).join("\n"));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "quitar") {
      const nivel = interaction.options.getInteger("nivel");
      const removed = deleteLevelRole(guildId, nivel);
      return interaction.reply({ content: removed > 0 ? `🗑️ Se quitó el rol del nivel ${nivel}.` : `❌ El nivel ${nivel} no tenía rol configurado.`, flags: 64 });
    }
  }
};
