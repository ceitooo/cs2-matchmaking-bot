const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType
} = require("@discordjs/voice");
const { getAudioStream } = require("./resolveTrack");

// mapa guildId -> estado del reproductor de ese servidor
const players = new Map();

function getGuildPlayer(guildId) {
  return players.get(guildId) ?? null;
}

function createGuildPlayer(guild, voiceChannel, textChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true
  });

  const audioPlayer = createAudioPlayer();
  connection.subscribe(audioPlayer);

  const state = {
    guildId: guild.id,
    connection,
    audioPlayer,
    voiceChannel,
    textChannel,
    queue: [],
    current: null,
    volume: 100,
    loop: "off" // 'off' | 'track' | 'queue'
  };

  audioPlayer.on(AudioPlayerStatus.Idle, () => {
    handleTrackEnd(state);
  });

  audioPlayer.on("error", (error) => {
    console.error("Error de audio:", error.message);
    handleTrackEnd(state);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000)
      ]);
    } catch {
      destroyGuildPlayer(guild.id);
    }
  });

  players.set(guild.id, state);
  return state;
}

function killCurrentProcess(state) {
  if (state.currentProcess && !state.currentProcess.killed) {
    state.currentProcess.kill("SIGKILL");
  }
  state.currentProcess = null;
}

function destroyGuildPlayer(guildId) {
  const state = players.get(guildId);
  if (!state) return;
  killCurrentProcess(state);
  state.audioPlayer.stop();
  state.connection.destroy();
  players.delete(guildId);
}

async function playNext(state) {
  const repeatSameTrack = state.loop === "track" && state.current && !state.skipRequested;
  const track = repeatSameTrack ? state.current : state.queue.shift();
  state.skipRequested = false;

  if (!track) {
    state.current = null;
    return;
  }

  if (state.loop === "queue" && state.current && !repeatSameTrack) {
    state.queue.push(state.current);
  }

  state.current = track;

  killCurrentProcess(state);
  const stream = await getAudioStream(track.url);
  state.currentProcess = stream.process ?? null;

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type ?? StreamType.Arbitrary,
    inlineVolume: true
  });
  resource.volume?.setVolume(state.volume / 100);

  state.resource = resource;
  state.audioPlayer.play(resource);

  // require perezoso para evitar dependencia circular con panel.js
  require("./panel").refreshMusicPanel(state.textChannel.guild).catch(() => {});
}

function handleTrackEnd(state) {
  playNext(state)
    .catch((err) => {
      console.error("Error reproduciendo siguiente pista:", err.message);
      state.textChannel?.send(`⚠️ No se pudo reproducir **${state.current?.title ?? "una pista"}**, paso a la siguiente.`).catch(() => {});
      return playNext(state);
    })
    .catch(() => {});

  if (!state.current) {
    require("./panel").refreshMusicPanel(state.textChannel.guild).catch(() => {});
  }
}

function skipTrack(state) {
  state.skipRequested = true;
  state.audioPlayer.stop();
}

async function enqueue(state, track) {
  state.queue.push(track);
  if (state.audioPlayer.state.status === AudioPlayerStatus.Idle && !state.current) {
    await playNext(state);
    return "playing";
  }
  return "queued";
}

module.exports = {
  getGuildPlayer,
  createGuildPlayer,
  destroyGuildPlayer,
  enqueue,
  playNext,
  skipTrack
};
