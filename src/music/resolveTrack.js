const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const playdl = require("play-dl");
const { ensureNetscapeCookiesFile } = require("./ytdlpCookies");

const SPOTIFY_TRACK_REGEX = /open\.spotify\.com\/(?:intl-\w+\/)?track\/([a-zA-Z0-9]+)/;
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

const YTDLP_PATH = path.join(__dirname, "..", "..", "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const cookiesFile = ensureNetscapeCookiesFile();

async function spotifyUrlToSearchQuery(url) {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (!res.ok) return null;
  const data = await res.json();
  // data.title suele venir como "Nombre de la canción" y el autor en data.author_name (o dentro del título)
  return data.author_name ? `${data.title} ${data.author_name}` : data.title;
}

/**
 * Resuelve lo que el usuario escribió en /play a una pista reproducible de YouTube.
 * Acepta: link de YouTube, link de Spotify (busca la misma canción en YouTube), o texto libre (búsqueda).
 */
async function resolveTrack(query, requestedBy) {
  let searchQuery = query;

  if (SPOTIFY_TRACK_REGEX.test(query)) {
    const spotifyQuery = await spotifyUrlToSearchQuery(query).catch(() => null);
    if (!spotifyQuery) throw new Error("No se pudo leer esa canción de Spotify.");
    searchQuery = spotifyQuery;
  }

  let videoInfo;

  if (YOUTUBE_URL_REGEX.test(searchQuery)) {
    const info = await playdl.video_basic_info(searchQuery).catch(() => null);
    if (!info) throw new Error("No se pudo leer ese link de YouTube.");
    videoInfo = info.video_details;
  } else {
    const results = await playdl.search(searchQuery, { limit: 1, source: { youtube: "video" } });
    if (!results.length) throw new Error(`No encontré resultados para "${searchQuery}".`);
    videoInfo = results[0];
  }

  return {
    title: videoInfo.title,
    url: videoInfo.url,
    durationSec: videoInfo.durationInSec ?? 0,
    thumbnail: videoInfo.thumbnails?.[videoInfo.thumbnails.length - 1]?.url ?? null,
    requestedBy
  };
}

/**
 * Extrae el audio con yt-dlp (mucho más resistente a los cambios de YouTube que las librerías de Node)
 * y lo entrega como un stream para que @discordjs/voice lo transcodifique con ffmpeg.
 */
function getAudioStream(url) {
  if (!fs.existsSync(YTDLP_PATH)) {
    throw new Error("yt-dlp no está instalado. Corre `node scripts/download-ytdlp.js`.");
  }

  const args = [
    "-f",
    "bestaudio",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--js-runtimes",
    `node:${process.execPath}`,
    "-o",
    "-",
    url
  ];
  if (cookiesFile) args.unshift("--cookies", cookiesFile);

  const child = spawn(YTDLP_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stderrBuffer = "";
  child.stderr.on("data", (chunk) => {
    stderrBuffer += chunk.toString();
  });
  child.on("close", (code) => {
    if (code !== 0 && stderrBuffer) console.error("yt-dlp error:", stderrBuffer.slice(0, 500));
  });

  return { stream: child.stdout, type: undefined, process: child };
}

module.exports = { resolveTrack, getAudioStream };
