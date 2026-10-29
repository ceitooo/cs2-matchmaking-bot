const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

const VERIFIED_ROLE_ID = "1563952522463543380";
const USER_ROLE_ID = "1339103137901969439";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verificar")
    .setDescription("Administración de verificación y roles Verified/User en CeitoTweaks")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("pendientes")
        .setDescription("Otorga Verified y User a todos los miembros que están en verify sin roles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("usuario")
        .setDescription("Otorga Verified y User a un usuario específico")
        .addUserOption((opt) => opt.setName("miembro").setDescription("Usuario a verificar").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("sync")
        .setDescription("Sincroniza Verified y User en todos los miembros del servidor")
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({
        content: "❌ Solo el Staff o administradores pueden usar este comando.",
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    const verifiedRole = guild.roles.cache.get(VERIFIED_ROLE_ID);
    const userRole = guild.roles.cache.get(USER_ROLE_ID);

    if (!verifiedRole || !userRole) {
      return interaction.editReply({
        content: "❌ No se encontraron los roles `Verified` o `User` en este servidor."
      });
    }

    if (sub === "usuario") {
      const targetUser = interaction.options.getUser("miembro", true);
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply({ content: "❌ No se pudo encontrar a ese miembro en el servidor." });
      }

      await member.roles.add([VERIFIED_ROLE_ID, USER_ROLE_ID], "Verificación manual por Staff").catch((e) => {
        throw new Error(`Error al dar roles: ${e.message}`);
      });

      return interaction.editReply({
        content: `✅ Se otorgaron los roles **Verified** y **User** a <@${member.id}>.`
      });
    }

    if (sub === "pendientes") {
      await guild.members.fetch();
      const targets = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const hasV = m.roles.cache.has(VERIFIED_ROLE_ID);
        const hasU = m.roles.cache.has(USER_ROLE_ID);
        // Quienes están en verify (sin roles o con uno solo)
        if (!hasV && !hasU) {
          targets.push(m);
        }
      });

      if (targets.length === 0) {
        return interaction.editReply({
          content: "ℹ️ No hay usuarios pendientes en verify. Todos ya tienen sus roles."
        });
      }

      interaction.editReply({
        content: `⏳ Asignando **Verified** y **User** a **${targets.length}** usuario(s) pendiente(s)...`
      });

      let ok = 0;
      let err = 0;
      for (const m of targets) {
        try {
          await m.roles.add([VERIFIED_ROLE_ID, USER_ROLE_ID], "Verificación masiva de usuarios en verify");
          ok++;
        } catch (_) {
          err++;
        }
        await new Promise((r) => setTimeout(r, 350));
      }

      return interaction.followUp({
        content: `✅ Proceso completado: Se verificaron **${ok}** usuarios correctamente.${err > 0 ? ` (${err} fallos)` : ""}`,
        flags: 64
      });
    }

    if (sub === "sync") {
      await guild.members.fetch();
      const targets = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const hasV = m.roles.cache.has(VERIFIED_ROLE_ID);
        const hasU = m.roles.cache.has(USER_ROLE_ID);
        if (!hasV || !hasU) {
          targets.push({ m, hasV, hasU });
        }
      });

      if (targets.length === 0) {
        return interaction.editReply({
          content: "ℹ️ Todos los miembros ya tienen ambos roles sincronizados."
        });
      }

      interaction.editReply({
        content: `⏳ Sincronizando roles para **${targets.length}** miembros... Esto tomará unos momentos.`
      });

      let ok = 0;
      for (const item of targets) {
        const toAdd = [];
        if (!item.hasV) toAdd.push(VERIFIED_ROLE_ID);
        if (!item.hasU) toAdd.push(USER_ROLE_ID);
        try {
          await item.m.roles.add(toAdd, "Sincronización masiva de roles Verified/User");
          ok++;
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 350));
      }

      return interaction.followUp({
        content: `✅ Sincronización completada para **${ok}** miembros.`,
        flags: 64
      });
    }
  }
};
