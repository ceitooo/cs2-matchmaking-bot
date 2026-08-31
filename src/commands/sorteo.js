const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addGiveaway, getGiveaway, endGiveawayDb } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { finishGiveaway } = require("../utils/giveawayChecker");

const GIVEAWAY_EMOJI = "🎉";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Sorteos con reacción (solo staff o ceito)")
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

      const embed = new EmbedBuilder()
        .setTitle("🎉 ¡Sorteo!")
        .setColor(0xf1c40f)
        .setDescription(`Premio: **${prize}**\nGanadores: **${ganadores}**\nTermina: <t:${Math.floor(endsAt / 1000)}:R>\n\nReaccioná con ${GIVEAWAY_EMOJI} para participar.`)
        .setFooter({ text: `Organizado por ${interaction.user.username}` });

      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      await message.react(GIVEAWAY_EMOJI).catch(() => {});

      addGiveaway(interaction.guild.id, interaction.channelId, message.id, prize, ganadores, endsAt, interaction.user.id);
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
