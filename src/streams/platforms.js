// Consultas de estado por plataforma. Cada check devuelve:
// { live: { id, title, category, viewers, thumbnail, url } | null, video?: { id, title, url, thumbnail } | null, avatar? }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

// ── Tokens de app (client_credentials) ──────────────────────────────────────
const tokens = {};
async function getAppToken(key, tokenUrl, clientId, clientSecret) {
  const cached = tokens[key];
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" })
  });
  if (!res.ok) throw new Error(`No se pudo obtener token de ${key}: HTTP ${res.status}`);
  const json = await res.json();
  tokens[key] = { token: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

// ── Twitch ──────────────────────────────────────────────────────────────────
async function twitchGet(path) {
  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) throw new Error("Faltan TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET en el .env");
  const token = await getAppToken("twitch", "https://id.twitch.tv/oauth2/token", TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { "Client-Id": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) delete tokens.twitch;
  if (!res.ok) throw new Error(`Twitch HTTP ${res.status}`);
  return res.json();
}

async function checkTwitch(username) {
  const login = encodeURIComponent(username.toLowerCase());
  const [{ data: streams }, { data: users }] = await Promise.all([
    twitchGet(`streams?user_login=${login}`),
    twitchGet(`users?login=${login}`)
  ]);
  const user = users?.[0];
  if (!user) return { notFound: true };
  const s = streams?.[0];
  return {
    displayName: user.display_name,
    avatar: user.profile_image_url,
    live: s
      ? {
          id: s.id,
          title: s.title,
          category: s.game_name,
          viewers: s.viewer_count,
          thumbnail: s.thumbnail_url.replace("{width}", "1280").replace("{height}", "720") + `?t=${Date.now()}`,
          url: `https://twitch.tv/${user.login}`
        }
      : null
  };
}

// ── Kick ────────────────────────────────────────────────────────────────────
async function checkKick(username) {
  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET } = process.env;
  if (!KICK_CLIENT_ID || !KICK_CLIENT_SECRET) throw new Error("Faltan KICK_CLIENT_ID / KICK_CLIENT_SECRET en el .env");
  const token = await getAppToken("kick", "https://id.kick.com/oauth/token", KICK_CLIENT_ID, KICK_CLIENT_SECRET);
  const slug = encodeURIComponent(username.toLowerCase());
  const res = await fetch(`https://api.kick.com/public/v1/channels?slug=${slug}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (res.status === 401) delete tokens.kick;
  if (!res.ok) throw new Error(`Kick HTTP ${res.status}`);
  const ch = (await res.json()).data?.[0];
  if (!ch) return { notFound: true };
  const s = ch.stream;
  return {
    displayName: ch.slug,
    avatar: null,
    live: s?.is_live
      ? {
          id: s.start_time || `${ch.broadcaster_user_id}-${s.key ?? "live"}`,
          title: ch.stream_title,
          category: ch.category?.name,
          viewers: s.viewer_count,
          thumbnail: s.thumbnail ? `${s.thumbnail}?t=${Date.now()}` : null,
          url: `https://kick.com/${ch.slug}`
        }
      : null
  };
}

// ── YouTube (sin API key: página del canal + RSS) ───────────────────────────
const ytConsent = { Cookie: "CONSENT=YES+cb; SOCS=CAI" };
const ytChannelCache = new Map();

async function resolveYoutubeChannel(username) {
  if (/^UC[\w-]{22}$/.test(username)) return username;
  if (ytChannelCache.has(username)) return ytChannelCache.get(username);
  const handle = username.startsWith("@") ? username : `@${username}`;
  const html = await fetchText(`https://www.youtube.com/${encodeURIComponent(handle)}`, ytConsent).catch(() => null);
  const id = html?.match(/"externalId":"(UC[\w-]{22})"/)?.[1] || html?.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
  if (id) ytChannelCache.set(username, id);
  return id ?? null;
}

function decodeXml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function checkYoutube(username) {
  const channelId = await resolveYoutubeChannel(username);
  if (!channelId) return { notFound: true };

  // Directo: la ruta /live redirige al video en directo si lo hay
  let live = null;
  const liveHtml = await fetchText(`https://www.youtube.com/channel/${channelId}/live`, ytConsent).catch(() => "");
  if (/"isLiveNow":true/.test(liveHtml) || /"isLive":true/.test(liveHtml)) {
    const videoId = liveHtml.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1];
    if (videoId) {
      const title = liveHtml.match(/<meta name="title" content="([^"]*)"/)?.[1];
      live = {
        id: videoId,
        title: title ? decodeXml(title) : "En directo",
        category: null,
        viewers: null,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg?t=${Date.now()}`,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    }
  }

  // Último video subido: pestaña /videos del canal (el RSS de YouTube falla a menudo)
  let video = null;
  let displayName = username;
  const page = await fetchText(`https://www.youtube.com/channel/${channelId}/videos`, ytConsent).catch(() => null);
  if (page) {
    const name = page.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
    if (name) displayName = decodeXml(name);
    const id = page.match(/"contentId":"([\w-]{11})"/)?.[1] || page.match(/"videoRenderer":\{"videoId":"([\w-]{11})"/)?.[1];
    const rawTitle = page.match(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/)?.[1];
    const title = rawTitle ? JSON.parse(`"${rawTitle}"`) : "Nuevo video";
    if (id) video = { id, title, url: `https://www.youtube.com/watch?v=${id}`, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }

  return { displayName, avatar: null, live, video };
}

// ── TikTok (sin API oficial de directos: página del perfil) ─────────────────
async function checkTiktok(username) {
  const user = username.replace(/^@/, "");
  const res = await fetch(`https://www.tiktok.com/api-live/user/room/?aid=1988&sourceType=54&uniqueId=${encodeURIComponent(user)}`, {
    headers: { "User-Agent": UA }
  });
  if (!res.ok) throw new Error(`TikTok HTTP ${res.status}`);
  const json = await res.json();
  if (json.message === "user_not_found") return { notFound: true };
  if (!json.data) throw new Error(`TikTok respondió ${json.message || json.statusCode}`);

  const { user: info, liveRoom: room } = json.data;
  let live = null;
  // status 2 = en directo, 4 = sin directo
  if (room?.status === 2 || info?.status === 2) {
    live = {
      id: String(info.roomId || room.startTime),
      title: room?.title || "En directo en TikTok",
      category: null,
      viewers: room?.liveRoomStats?.userCount ?? null,
      thumbnail: room?.coverUrl || null,
      url: `https://www.tiktok.com/@${user}/live`
    };
  }
  return { displayName: info?.nickname || user, avatar: info?.avatarMedium || null, live };
}

const PLATFORMS = {
  twitch: { name: "Twitch", color: 0x9146ff, emoji: "🟣", check: checkTwitch, profile: (u) => `https://twitch.tv/${u}` },
  youtube: { name: "YouTube", color: 0xff0000, emoji: "🔴", check: checkYoutube, profile: (u) => `https://www.youtube.com/${u.startsWith("@") || u.startsWith("UC") ? u : "@" + u}` },
  kick: { name: "Kick", color: 0x53fc18, emoji: "🟢", check: checkKick, profile: (u) => `https://kick.com/${u}` },
  tiktok: { name: "TikTok", color: 0x111111, emoji: "⚫", check: checkTiktok, profile: (u) => `https://www.tiktok.com/@${u.replace(/^@/, "")}` }
};

module.exports = { PLATFORMS };
