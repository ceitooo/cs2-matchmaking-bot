const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { db } = require("../db/database");
const { balanceTeams } = require("./elo");

const QUEUE_SIZE = 10;

async function tryStartMatch(guild, textChannel) {
  const queued = db
    .prepare(
      `SELECT players.* FROM queue
       JOIN players ON players.user_id = queue.user_id
       ORDER BY queue.joined_at ASC LIMIT ?`
    )
    .all(QUEUE_SIZE);

  if (queued.length < QUEUE_SIZE) return null;

  const meta = db.prepare("SELECT match_code FROM queue_meta WHERE id = 1").get();
  const matchCode = meta?.match_code ?? null;
  db.prepare("DELETE FROM queue_meta WHERE id = 1").run();

  const userIds = queued.map((p) => p.user_id);
  const removeFromQueue = db.prepare("DELETE FROM queue WHERE user_id = ?");
  const markInMatch = db.prepare("UPDATE players SET in_queue = 0, in_match = 1 WHERE user_id = ?");
  for (const id of userIds) {
    removeFromQueue.run(id);
    markInMatch.run(id);
  }

  const { teamA, teamB } = balanceTeams(queued);

  const category = await guild.channels.create({
    name: `Partida CS2`,
    type: ChannelType.GuildCategory
  });

  const voiceA = await guild.channels.create({
    name: "🔫 Equipo A",
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
      ...teamA.map((p) => ({ id: p.user_id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel] }))
    ]
  });

  const voiceB = await guild.channels.create({
    name: "🔫 Equipo B",
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
      ...teamB.map((p) => ({ id: p.user_id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel] }))
    ]
  });

  const matchChannel = await guild.channels.create({
    name: "📋-partida",
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...userIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
    ]
  });

  const teamAAvg = Math.round(teamA.reduce((s, p) => s + p.elo, 0) / teamA.length);
  const teamBAvg = Math.round(teamB.reduce((s, p) => s + p.elo, 0) / teamB.length);

  const result = db
    .prepare(
      `INSERT INTO matches (guild_id, status, team_a, team_b, team_a_channel, team_b_channel, text_channel, created_at)
       VALUES (?, 'ongoing', ?, ?, ?, ?, ?, ?)`
    )
    .run(guild.id, JSON.stringify(teamA.map((p) => p.user_id)), JSON.stringify(teamB.map((p) => p.user_id)), voiceA.id, voiceB.id, matchChannel.id, Date.now());

  const matchId = result.lastInsertRowid;

  const embed = new EmbedBuilder()
    .setTitle(`🎮 Partida #${matchId} lista`)
    .setColor(0x2ecc71)
    .addFields(
      { name: `🅰️ Equipo A (ELO prom. ${teamAAvg})`, value: teamA.map((p) => `${p.username} — ${p.elo}`).join("\n"), inline: true },
      { name: `🅱️ Equipo B (ELO prom. ${teamBAvg})`, value: teamB.map((p) => `${p.username} — ${p.elo}`).join("\n"), inline: true }
    )
    .setDescription(`Únanse a sus canales de voz y entren a la partida con el código de abajo. Cuando termine, un admin confirma el resultado.`)
    .setFooter({ text: "El resultado lo confirma un admin con /resultado" });

  if (matchCode) {
    embed.addFields({
      name: "🔑 Código de matchmaking privado",
      value: `\`\`\`${matchCode}\`\`\`\nEn CS2: Jugar → Matchmaking Privado → Introducir código`
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`match_win_a_${matchId}`).setLabel("Ganó Equipo A").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`match_win_b_${matchId}`).setLabel("Ganó Equipo B").setStyle(ButtonStyle.Primary)
  );

  await matchChannel.send({
    content: userIds.map((id) => `<@${id}>`).join(" "),
    embeds: [embed],
    components: [row]
  });

  if (textChannel) {
    await textChannel.send({ content: `✅ ¡Partida #${matchId} formada! Vayan a ${matchChannel}.` });
  }

  return matchId;
}

module.exports = { tryStartMatch, QUEUE_SIZE };
