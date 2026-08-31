const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addBlacklistWord, listBlacklistWords, deleteBlacklistWord } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Palabras prohibidas: se borran solas si alguien no-staff las escribe (solo staff o ceito)")
    .addSubcommand((sub) => sub.setName("agregar").setDescription("Agrega una palabra prohibida").addStringOption((o) => o.setName("palabra").setDescription("Palabra a bloquear").setRequired(true)))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista las palabras prohibidas"))
    .addSubcommand((sub) =>
      sub.setName("quitar").setDescription("Elimina una palabra prohibida").addIntegerOption((o) => o.setName("id").setDescription("Elegí la palabra").setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const words = listBlacklistWords(interaction.guild.id);
    const search = String(interaction.options.getFocused()).toLowerCase();
    const choices = words
      .filter((w) => w.word.includes(search))
      .slice(0, 25)
      .map((w) => ({ name: `#${w.id} — ${w.word}`, value: w.id }));
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
      const created = addBlacklistWord(guildId, palabra, interaction.user.id);
      return interaction.reply({ content: `✅ Palabra #${created.id} agregada a la blacklist: "**${palabra}**"`, flags: 64 });
    }

    if (sub === "listar") {
      const words = listBlacklistWords(guildId);
      if (words.length === 0) {
        return interaction.reply({ content: "📭 No hay palabras en la blacklist.", flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setTitle("🚫 Palabras prohibidas")
        .setColor(0xe74c3c)
        .setDescription(words.map((w) => `**#${w.id}** — ${w.word}`).join("\n"));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "quitar") {
      const id = interaction.options.getInteger("id");
      const removed = deleteBlacklistWord(guildId, id);
      return interaction.reply({ content: removed > 0 ? `🗑️ Palabra #${id} eliminada.` : `❌ No encontré la palabra #${id}.`, flags: 64 });
    }
  }
};
