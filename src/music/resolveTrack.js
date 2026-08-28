const playdl = require("play-dl");

const SPOTIFY_TRACK_REGEX = /open\.spotify\.com\/(?:intl-\w+\/)?track\/([a-zA-Z0-9]+)/;
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

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

async function getAudioStream(url) {
  // quality: 2 = la mejor calidad de audio disponible en YouTube (suele venir en Opus, sin perder calidad al reencodear)
  return playdl.stream(url, { quality: 2 });
}

module.exports = { resolveTrack, getAudioStream };
