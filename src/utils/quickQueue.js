const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { db } = require("../db/database");

const ACCESO_ROLE_ID = "1339321456529637486"; // rol "acceso"
const EXPIRE_AFTER_MS = 2 * 60 * 60 * 1000; // 2 horas sin completarse

const MODES = {
  premier: { label: "Premier", size: 5, channelName: "premier" },
  compe: { label: "Compe", size: 5, channelName: "compe" },
  duo: { label: "Duo", size: 2, channelName: "duo" }
};

const expireTimers = new Map(); // queueId -> Timeout

function clearExpireTimer(queueId) {
  const t = expireTimers.get(queueId);
  if (t) {
    clearTimeout(t);
    expireTimers.delete(queueId);
  }
}

function scheduleExpire(client, queueId) {
  clearExpireTimer(queueId);
  const timer = setTimeout(async () => {
    const queue = db.prepare("SELECT * FROM quick_queues WHERE id = ?").get(queueId);
    if (!queue || queue.status !== "open") return;

    db.prepare("DELETE FROM quick_queue_players WHERE queue_id = ?").run(queueId);
    db.prepare("UPDATE quick_queues SET first_joined_at = NULL WHERE id = ?").run(queueId);

    const channel = await client.channels.fetch(queue.channel_id).catch(() => null);
    if (channel && queue.message_id) {
      const message = await channel.messages.fetch(queue.message_id).catch(() => null);
      if (message) await message.edit(buildQuickQueuePanel(queueId)).catch(() => {});
    }
  }, EXPIRE_AFTER_MS);
  expireTimers.set(queueId, timer);
}

function buildQuickQueuePanel(queueId) {
  const queue = db.prepare("SELECT * FROM quick_queues WHERE id = ?").get(queueId);
  if (!queue) {
    return { content: "Esta cola ya no existe.", embeds: [], components: [] };
  }

  const modeInfo = MODES[queue.mode];
  const players = db
    .prepare(
      `SELECT quick_queue_players.*, players.username, players.avatar_url FROM quick_queue_players
       JOIN players ON players.user_id = quick_queue_players.user_id
       WHERE queue_id = ? ORDER BY joined_at ASC`
    )
    .all(queueId);

  const content =
    `## 🎯 Cola de ${modeInfo.label}\n` +
    (players.length ? "" : "_Cola vacía. ¡Sé el primero en unirte!_\n") +
    `${players.length}/${modeInfo.size} jugadores · se vacía sola tras 2h sin completarse`;

  const playerEmbeds = players
    .slice(0, 10)
    .map((p, i) => new EmbedBuilder().setAuthor({ name: `${i + 1}. ${p.username}`, iconURL: p.avatar_url || undefined }).setColor(0xff6b35));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`qq_join:${queueId}`).setLabel("Unirse").setStyle(ButtonStyle.Success).setEmoji("✅").setDisabled(players.length >= modeInfo.size),
    new ButtonBuilder().setCustomId(`qq_leave:${queueId}`).setLabel("Salir").setStyle(ButtonStyle.Danger).setEmoji("❌")
  );

  return { content, embeds: playerEmbeds, components: [row] };
}

async function createQuickQueue(interaction, mode) {
  const modeInfo = MODES[mode];
  const result = db
    .prepare("INSERT INTO quick_queues (guild_id, channel_id, mode, size, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)")
    .run(interaction.guildId, interaction.channelId, mode, modeInfo.size, Date.now());

  const queueId = result.lastInsertRowid;
  await interaction.reply(buildQuickQueuePanel(queueId));
  const message = await interaction.fetchReply();
  db.prepare("UPDATE quick_queues SET message_id = ? WHERE id = ?").run(message.id, queueId);
}

async function joinQuickQueue(interaction, queueId) {
  const queue = db.prepare("SELECT * FROM quick_queues WHERE id = ?").get(queueId);
  if (!queue || queue.status !== "open") {
    return interaction.reply({ content: "Esta cola ya no existe.", flags: 64 });
  }

  const already = db.prepare("SELECT 1 FROM quick_queue_players WHERE queue_id = ? AND user_id = ?").get(queueId, interaction.user.id);
  if (already) {
    return interaction.reply({ content: "Ya estás en esta cola.", flags: 64 });
  }

  const modeInfo = MODES[queue.mode];
  const count = db.prepare("SELECT COUNT(*) as c FROM quick_queue_players WHERE queue_id = ?").get(queueId).c;
  if (count >= modeInfo.size) {
    return interaction.reply({ content: "La cola ya está llena.", flags: 64 });
  }

  db.prepare("INSERT INTO quick_queue_players (queue_id, user_id, joined_at) VALUES (?, ?, ?)").run(queueId, interaction.user.id, Date.now());

  if (count === 0) {
    db.prepare("UPDATE quick_queues SET first_joined_at = ? WHERE id = ?").run(Date.now(), queueId);
    scheduleExpire(interaction.client, queueId);
  }

  const newCount = count + 1;

  if (newCount >= modeInfo.size) {
    clearExpireTimer(queueId);
    await interaction.update(buildQuickQueuePanel(queueId));
    await createTempVoiceChannel(interaction.guild, queueId);
    return;
  }

  await interaction.update(buildQuickQueuePanel(queueId));
}

async function leaveQuickQueue(interaction, queueId) {
  const removed = db.prepare("DELETE FROM quick_queue_players WHERE queue_id = ? AND user_id = ?").run(queueId, interaction.user.id);
  if (removed.changes === 0) {
    return interaction.reply({ content: "No estabas en esta cola.", flags: 64 });
  }

  const remaining = db.prepare("SELECT COUNT(*) as c FROM quick_queue_players WHERE queue_id = ?").get(queueId).c;
  if (remaining === 0) {
    clearExpireTimer(queueId);
    db.prepare("UPDATE quick_queues SET first_joined_at = NULL WHERE id = ?").run(queueId);
  }

  await interaction.update(buildQuickQueuePanel(queueId));
}

async function createTempVoiceChannel(guild, queueId) {
  const queue = db.prepare("SELECT * FROM quick_queues WHERE id = ?").get(queueId);
  const modeInfo = MODES[queue.mode];
  const players = db.prepare("SELECT * FROM quick_queue_players WHERE queue_id = ?").all(queueId);

  const allChannels = await guild.channels.fetch();
  const maxPosition = Math.max(0, ...allChannels.filter((c) => c).map((c) => c.rawPosition ?? 0));

  const voice = await guild.channels.create({
    name: modeInfo.channelName,
    type: ChannelType.GuildVoice,
    position: maxPosition + 1,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
      { id: ACCESO_ROLE_ID, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak, PermissionFlagsBits.UseVAD] },
      ...players.map((p) => ({
        id: p.user_id,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak, PermissionFlagsBits.UseVAD]
      }))
    ]
  });

  db.prepare("INSERT INTO quick_voice_channels (channel_id, guild_id) VALUES (?, ?)").run(voice.id, guild.id);
  db.prepare("UPDATE quick_queues SET voice_channel_id = ?, status = 'finished' WHERE id = ?").run(voice.id, queueId);
  db.prepare("DELETE FROM quick_queue_players WHERE queue_id = ?").run(queueId);

  for (const p of players) {
    const member = await guild.members.fetch(p.user_id).catch(() => null);
    if (member?.voice?.channelId) await member.voice.setChannel(voice.id).catch(() => {});
  }

  const textChannel = await guild.channels.fetch(queue.channel_id).catch(() => null);
  if (textChannel) {
    const thread = await textChannel.threads
      .create({
        name: `Cola ${modeInfo.label} completa`,
        type: ChannelType.PrivateThread,
        invitable: false,
        autoArchiveDuration: 60
      })
      .catch(() => null);

    if (thread) {
      for (const p of players) {
        await thread.members.add(p.user_id).catch(() => {});
      }
      await thread.send(`✅ ¡Cola de **${modeInfo.label}** completa! Canal de voz: ${voice.toString()}`).catch(() => {});
    }
  }
}

async function handleVoiceChannelEmpty(channel) {
  const tracked = db.prepare("SELECT 1 FROM quick_voice_channels WHERE channel_id = ?").get(channel.id);
  if (!tracked) return;
  if (channel.members.size > 0) return;

  db.prepare("DELETE FROM quick_voice_channels WHERE channel_id = ?").run(channel.id);
  await channel.delete().catch(() => {});
}

module.exports = {
  MODES,
  buildQuickQueuePanel,
  createQuickQueue,
  joinQuickQueue,
  leaveQuickQueue,
  handleVoiceChannelEmpty
};
