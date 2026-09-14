const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { addGiveaway, getGiveaway, endGiveawayDb, countGiveawayEntries } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { finishGiveaway, buildEndedRows } = require("../utils/giveawayChecker");

function buildGiveawayEmbed({ prize, winnersCount, entries, hostId, endsAt, giveawayId }) {
  return new EmbedBuilder()
    .setTitle(`🎉 Sorteo · ${prize}`)
    .setColor(0xf1c40f)
    .addFields(
      { name: "Premio", value: `**${prize}**`, inline: false },
      { name: "Ganadores", value: `${winnersCount}`, inline: true },
      { name: "Participantes", value: `${entries}`, inline: true },
      { name: "Organiza", value: `<@${hostId}>`, inline: true },
      { name: "Termina", value: `<t:${Math.floor(endsAt / 1000)}:R> · <t:${Math.floor(endsAt / 1000)}:F>`, inline: false }
    )
    .setFooter({ text: `ID del sorteo: ${giveawayId ?? "?"}` });
}

function buildActiveRow(giveawayId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway_enter:${giveawayId}`).setLabel("Participar").setEmoji("🎉").setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Sorteos con botón de participar (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("iniciar")
        .setDescription("Inicia un sorteo")
        .addStringOption((o) => o.setName("premio").setDescription("Qué se sortea").setRequired(true))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Duración del sorteo").setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o
            .setName("unidad")
            .setDescription("Unidad de tiempo")
            .setRequired(true)
            .addChoices({ name: "minutos", value: "minutos" }, { name: "horas", value: "horas" }, { name: "días", value: "dias" })
        )
        .addIntegerOption((o) => o.setName("ganadores").setDescription("Cantidad de ganadores (default 1)").setRequired(false).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub.setName("terminar").setDescription("Termina un sorteo antes de tiempo").addIntegerOption((o) => o.setName("id").setDescription("ID del sorteo").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "iniciar") {
      const prize = interaction.options.getString("premio");
      const cantidad = interaction.options.getInteger("cantidad");
      const unidad = interaction.options.getString("unidad");
      const ganadores = interaction.options.getInteger("ganadores") ?? 1;

      const MINUTE_MS = 60 * 1000;
      const minutosEquivalentes = unidad === "dias" ? cantidad * 24 * 60 : unidad === "horas" ? cantidad * 60 : cantidad;
      const endsAt = Date.now() + minutosEquivalentes * MINUTE_MS;

      const placeholderEmbed = buildGiveawayEmbed({ prize, winnersCount: ganadores, entries: 0, hostId: interaction.user.id, endsAt, giveawayId: null });

      await interaction.reply({ embeds: [placeholderEmbed] });
      const message = await interaction.fetchReply();

      const created = addGiveaway(interaction.guild.id, interaction.channelId, message.id, prize, ganadores, endsAt, interaction.user.id);

      const finalEmbed = buildGiveawayEmbed({ prize, winnersCount: ganadores, entries: 0, hostId: interaction.user.id, endsAt, giveawayId: created.id });
      await message.edit({ embeds: [finalEmbed], components: [buildActiveRow(created.id)] }).catch(() => {});
      return;
    }

    if (sub === "terminar") {
      const id = interaction.options.getInteger("id");
      const giveaway = getGiveaway(interaction.guild.id, id);
      if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: "❌ No encontré ese sorteo activo.", flags: 64 });
      }

      await interaction.reply({ content: `✅ Terminando el sorteo #${id}...`, flags: 64 });
      endGiveawayDb(id);
      await finishGiveaway(interaction.client, giveaway);
      return;
    }
  }
};

module.exports.buildGiveawayEmbed = buildGiveawayEmbed;
module.exports.buildActiveRow = buildActiveRow;
