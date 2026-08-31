const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addFaq, listFaqs, deleteFaq } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Preguntas frecuentes: el bot responde solo si detecta la palabra clave (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Agrega una FAQ")
        .addStringOption((o) => o.setName("palabra").setDescription("Palabra o frase clave a detectar (ej: metodos de pago)").setRequired(true))
        .addStringOption((o) => o.setName("respuesta").setDescription("Qué responde el bot").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista todas las FAQs"))
    .addSubcommand((sub) =>
      sub.setName("quitar").setDescription("Elimina una FAQ").addIntegerOption((o) => o.setName("id").setDescription("Elegí la FAQ").setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const faqs = listFaqs(interaction.guild.id);
    const search = String(interaction.options.getFocused()).toLowerCase();
    const choices = faqs
      .filter((f) => f.keyword.includes(search))
      .slice(0, 25)
      .map((f) => ({ name: `#${f.id} — ${f.keyword}`.slice(0, 100), value: f.id }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "agregar") {
      const palabra = interaction.options.getString("palabra").trim();
      const respuesta = interaction.options.getString("respuesta").trim();
      const created = addFaq(guildId, palabra, respuesta, interaction.user.id);
      return interaction.reply({ content: `✅ FAQ #${created.id} agregada: cuando alguien escriba "**${palabra}**", respondo automático.`, flags: 64 });
    }

    if (sub === "listar") {
      const faqs = listFaqs(guildId);
      if (faqs.length === 0) {
        return interaction.reply({ content: "📭 No hay FAQs cargadas.", flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setTitle("❓ FAQs configuradas")
        .setColor(0x5865f2)
        .setDescription(faqs.map((f) => `**#${f.id}** — "${f.keyword}" → ${f.respuesta}`).join("\n").slice(0, 4000));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "quitar") {
      const id = interaction.options.getInteger("id");
      const removed = deleteFaq(guildId, id);
      return interaction.reply({ content: removed > 0 ? `🗑️ FAQ #${id} eliminada.` : `❌ No encontré la FAQ #${id}.`, flags: 64 });
    }
  }
};
