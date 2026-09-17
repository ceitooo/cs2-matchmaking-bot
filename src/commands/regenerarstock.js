const { SlashCommandBuilder } = require("discord.js");
const { addKey, getAvailableResources, keyExists } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { refreshStockPanel } = require("./stock");
const { extractKeys } = require("../utils/keyDetection");

function splitAccounts(raw) {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("regenerarstock")
    .setDescription("Carga stock al pool de premios por invitaciones (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("keys")
        .setDescription("Carga keys/códigos (ej: Ceitus Roblox, CeitoTweaks)")
        .addStringOption((o) => o.setName("recurso").setDescription("Nombre del recurso (ej: Ceitus Roblox)").setRequired(true))
        .addStringOption((o) => o.setName("keys").setDescription("Las keys a cargar, en cualquier formato/separador").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("cuentas")
        .setDescription("Carga cuentas con usuario/contraseña (ej: Netflix, Disney Premium)")
        .addStringOption((o) => o.setName("recurso").setDescription("Nombre del recurso (ej: Netflix)").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("cuentas")
            .setDescription("Las cuentas, dejando una línea en blanco entre cada una (Gmail: ...\\nContraseña: ...)")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const resource = interaction.options.getString("recurso").trim();

    let items;
    if (sub === "keys") {
      const rawKeys = interaction.options.getString("keys");
      const detected = extractKeys(rawKeys);
      items = detected.length > 0
        ? detected
        : rawKeys
            .split(/[\n,]+/)
            .map((k) => k.trim())
            .filter(Boolean);
    } else {
      const rawCuentas = interaction.options.getString("cuentas").replace(/\\n/g, "\n");
      items = splitAccounts(rawCuentas);
    }

    if (items.length === 0) {
      return interaction.reply({ content: "❌ No encontré nada válido en el texto.", flags: 64 });
    }

    let cargadas = 0;
    let duplicadas = 0;
    for (const item of items) {
      if (keyExists(interaction.guild.id, item)) {
        duplicadas++;
        continue;
      }
      addKey(interaction.guild.id, resource, item, interaction.user.id);
      cargadas++;
    }

    const stock = getAvailableResources(interaction.guild.id).find((r) => r.resource === resource)?.stock ?? cargadas;
    await refreshStockPanel(interaction.client, interaction.guild.id);

    const noun = sub === "cuentas" ? "cuenta" : "key";
    const dupText = duplicadas > 0 ? ` (${duplicadas} ya existían y se ignoraron)` : "";
    await interaction.reply({
      content: `✅ ${cargadas} ${noun}${cargadas === 1 ? "" : "s"} cargada${cargadas === 1 ? "" : "s"} para **${resource}**${dupText} (stock disponible: ${stock}).`,
      flags: 64
    });
  }
};
