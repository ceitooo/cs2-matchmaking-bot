const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings, setSecurityLevel, addScamDomain, listScamDomains, deleteScamDomain } = require("../db/database");
const { isCeitoOrDeveloper } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seguridad")
    .setDescription("Configura el nivel de seguridad anti-estafa/anti-raid del server (solo Ceito/Developer)")
    .addSubcommand((sub) =>
      sub
        .setName("nivel")
        .setDescription("Cambia el nivel de seguridad")
        .addStringOption((o) =>
          o
            .setName("nivel")
            .setDescription("Nivel a aplicar")
            .setRequired(true)
            .addChoices({ name: "Básico", value: "basico" }, { name: "Medio", value: "medio" }, { name: "Estricto", value: "estricto" })
        )
    )
    .addSubcommand((sub) => sub.setName("estado").setDescription("Muestra el nivel de seguridad actual y los dominios bloqueados"))
    .addSubcommand((sub) =>
      sub
        .setName("canal-logs")
        .setDescription("Define el canal donde se reportan las acciones del anti-estafa")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal de texto para los logs").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommandGroup((group) =>
      group
        .setName("dominio")
        .setDescription("Administra la lista de dominios bloqueados")
        .addSubcommand((sub) =>
          sub
            .setName("agregar")
            .setDescription("Bloquea un dominio (borra automáticamente cualquier mensaje que lo linkee)")
            .addStringOption((o) => o.setName("dominio").setDescription("Ej: hotcoin.win").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName("quitar")
            .setDescription("Quita un dominio de la lista bloqueada")
            .addStringOption((o) => o.setName("id").setDescription("ID del dominio (ver /seguridad estado)").setRequired(true))
        )
    ),

  async execute(interaction) {
    if (!isCeitoOrDeveloper(interaction)) {
      return interaction.reply({ content: "❌ Solo el rol Ceito o Developer puede usar este comando.", flags: 64 });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (group === "dominio") {
      if (sub === "agregar") {
        const dominio = interaction.options
          .getString("dominio", true)
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0];
        addScamDomain(guildId, dominio, interaction.user.id);
        return interaction.reply({ content: `🚫 Dominio **${dominio}** bloqueado. Cualquier mensaje que lo linkee se va a borrar automáticamente.`, flags: 64 });
      }

      if (sub === "quitar") {
        const id = Number(interaction.options.getString("id", true));
        const removed = deleteScamDomain(guildId, id);
        return interaction.reply({ content: removed ? "✅ Dominio quitado de la lista." : "❌ No encontré ese ID.", flags: 64 });
      }
    }

    const settings = getGuildSettings(guildId);

    if (sub === "nivel") {
      const nivel = interaction.options.getString("nivel", true);
      setSecurityLevel(guildId, nivel);
      return interaction.reply({ content: `🛡️ Nivel de seguridad cambiado a **${nivel}**. Usá \`/seguridadinfo\` para ver qué hace cada nivel.`, flags: 64 });
    }

    if (sub === "canal-logs") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(guildId, { antiscam_log_channel_id: canal.id });
      return interaction.reply({ content: `📋 Canal de logs de anti-estafa establecido en ${canal}.`, flags: 64 });
    }

    if (sub === "estado") {
      const dominios = listScamDomains(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🛡️ Estado de seguridad")
        .addFields(
          { name: "Nivel actual", value: settings.security_level ?? "medio", inline: true },
          { name: "Canal de logs", value: settings.antiscam_log_channel_id ? `<#${settings.antiscam_log_channel_id}>` : "No configurado", inline: true },
          {
            name: `Dominios bloqueados (${dominios.length})`,
            value: dominios.length > 0 ? dominios.map((d) => `\`${d.id}\` ${d.domain}`).join("\n").slice(0, 1000) : "Ninguno cargado todavía."
          }
        );
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
