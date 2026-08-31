const crypto = require("node:crypto");
const { SlashCommandBuilder } = require("discord.js");
const { addKey, getAvailableResources } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

function generateKey(resource) {
  const prefix = resource
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "KEY";
  const random = crypto.randomBytes(6).toString("hex").toUpperCase().match(/.{1,4}/g).join("-");
  return `${prefix}-${random}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createkey")
    .setDescription("Genera una key automáticamente y la agrega al pool de premios por invitaciones")
    .addStringOption((o) => o.setName("recurso").setDescription("Nombre del recurso (ej: Ceitus, Netflix, Disney+)").setRequired(true))
    .addIntegerOption((o) => o.setName("cantidad").setDescription("Cuántas keys generar (default 1)").setMinValue(1).setMaxValue(50).setRequired(false)),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const resource = interaction.options.getString("recurso").trim();
    const cantidad = interaction.options.getInteger("cantidad") ?? 1;

    const generated = [];
    for (let i = 0; i < cantidad; i++) {
      const key = generateKey(resource);
      addKey(interaction.guild.id, resource, key, interaction.user.id);
      generated.push(key);
    }

    const stock = getAvailableResources(interaction.guild.id).find((r) => r.resource === resource)?.stock ?? cantidad;

    await interaction.reply({
      content:
        `✅ ${cantidad === 1 ? "Key generada" : `${cantidad} keys generadas`} para **${resource}** (stock disponible: ${stock}):\n` +
        `\`\`\`${generated.join("\n")}\`\`\``,
      flags: 64
    });
  }
};
