const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addSubscription, listSubscriptions, deleteSubscription } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("recordatorio")
    .setDescription("Recordatorio de vencimiento: avisa por DM cuando falten 3 días (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Programa un recordatorio")
        .addUserOption((o) => o.setName("usuario").setDescription("A quién avisar").setRequired(true))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad de tiempo hasta el vencimiento").setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o
            .setName("unidad")
            .setDescription("Unidad de tiempo")
            .setRequired(true)
            .addChoices({ name: "días", value: "dias" }, { name: "meses", value: "meses" }, { name: "años", value: "anios" })
        )
        .addStringOption((o) => o.setName("producto").setDescription("De qué (opcional, ej: Netflix)").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("ver").setDescription("Lista todos los recordatorios activos"))
    .addSubcommand((sub) =>
      sub.setName("quitar").setDescription("Elimina un recordatorio").addIntegerOption((o) => o.setName("id").setDescription("ID del recordatorio").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "agregar") {
      const target = interaction.options.getUser("usuario");
      const cantidad = interaction.options.getInteger("cantidad");
      const unidad = interaction.options.getString("unidad");
      const product = interaction.options.getString("producto")?.trim() || "tu suscripción";

      const DAY_MS = 24 * 60 * 60 * 1000;
      const diasEquivalentes = unidad === "anios" ? cantidad * 365 : unidad === "meses" ? cantidad * 30 : cantidad;
      const expiresAt = Date.now() + diasEquivalentes * DAY_MS;

      const created = addSubscription(guildId, target.id, product, expiresAt, interaction.user.id);
      return interaction.reply({
        content: `✅ Recordatorio #${created.id}: ${target} — **${product}**, vence <t:${Math.floor(expiresAt / 1000)}:R>. Le aviso por DM 3 días antes.`,
        flags: 64
      });
    }

    if (sub === "ver") {
      const subs = listSubscriptions(guildId);
      if (subs.length === 0) {
        return interaction.reply({ content: "📭 No hay recordatorios activos.", flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setTitle("⏰ Recordatorios activos")
        .setColor(0x5865f2)
        .setDescription(
          subs.map((s) => `**#${s.id}** — <@${s.user_id}> — **${s.product}** — vence <t:${Math.floor(s.expires_at / 1000)}:R>`).join("\n")
        );

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "quitar") {
      const id = interaction.options.getInteger("id");
      const removed = deleteSubscription(guildId, id);
      return interaction.reply({
        content: removed > 0 ? `🗑️ Recordatorio #${id} eliminado.` : `❌ No encontré el recordatorio #${id}.`,
        flags: 64
      });
    }
  }
};
