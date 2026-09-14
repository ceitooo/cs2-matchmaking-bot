const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getActiveGiveawaysDue, endGiveawayDb, getGiveawayEntries } = require("../db/database");

const CHECK_INTERVAL_MS = 30 * 1000;

function pickWinners(userIds, count) {
  const pool = [...userIds];
  const winners = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

function buildEndedRows(giveawayId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_enter:${giveawayId}`).setLabel("🎉 Sorteo terminado").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(`giveaway_reroll:${giveawayId}`).setLabel("🎲 Reroll").setStyle(ButtonStyle.Danger)
    )
  ];
}

async function finishGiveaway(client, giveaway) {
  const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
  if (!message) return;

  const participantIds = getGiveawayEntries(giveaway.id);
  const winners = pickWinners(participantIds, giveaway.winners_count);

  const oldEmbed = message.embeds[0];
  const newEmbed = oldEmbed
    ? EmbedBuilder.from(oldEmbed).setColor(0x808080).setFields(
        oldEmbed.fields.map((f) => (f.name === "Termina" ? { name: "Terminó", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: f.inline } : f))
      )
    : new EmbedBuilder().setTitle(`🎉 Sorteo · ${giveaway.prize}`);

  await message.edit({ embeds: [newEmbed], components: buildEndedRows(giveaway.id) }).catch(() => {});

  const resultEmbed = new EmbedBuilder()
    .setTitle("🎉 ¡Sorteo terminado!")
    .setColor(0xf1c40f)
    .setDescription(
      winners.length > 0
        ? `Premio: **${giveaway.prize}**\nGanador${winners.length === 1 ? "" : "es"}: ${winners.map((id) => `<@${id}>`).join(", ")}`
        : `Premio: **${giveaway.prize}**\nNadie participó, sin ganadores.`
    );

  await channel.send({ embeds: [resultEmbed] }).catch(() => {});
}

async function checkGiveaways(client) {
  const due = getActiveGiveawaysDue();
  for (const giveaway of due) {
    endGiveawayDb(giveaway.id);
    await finishGiveaway(client, giveaway);
  }
}

function startGiveawayChecker(client) {
  checkGiveaways(client).catch((e) => console.error("[giveaway] Error:", e.message));
  setInterval(() => {
    checkGiveaways(client).catch((e) => console.error("[giveaway] Error:", e.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startGiveawayChecker, finishGiveaway, pickWinners, buildEndedRows };
