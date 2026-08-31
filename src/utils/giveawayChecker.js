const { EmbedBuilder } = require("discord.js");
const { getActiveGiveawaysDue, endGiveawayDb } = require("../db/database");

const GIVEAWAY_EMOJI = "🎉";
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

async function finishGiveaway(client, giveaway) {
  const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
  if (!message) return;

  const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
  const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
  const participantIds = users ? [...users.values()].filter((u) => !u.bot).map((u) => u.id) : [];

  const winners = pickWinners(participantIds, giveaway.winners_count);

  const embed = new EmbedBuilder()
    .setTitle("🎉 ¡Sorteo terminado!")
    .setColor(0xf1c40f)
    .setDescription(
      winners.length > 0
        ? `Premio: **${giveaway.prize}**\nGanador${winners.length === 1 ? "" : "es"}: ${winners.map((id) => `<@${id}>`).join(", ")}`
        : `Premio: **${giveaway.prize}**\nNadie participó, sin ganadores.`
    );

  await channel.send({ embeds: [embed] }).catch(() => {});
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

module.exports = { startGiveawayChecker, finishGiveaway };
