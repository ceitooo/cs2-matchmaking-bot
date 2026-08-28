const fs = require("node:fs");
const path = require("node:path");

const JSON_COOKIES_PATH = path.join(__dirname, "..", "..", "youtube-cookies.json");
const NETSCAPE_COOKIES_PATH = path.join(__dirname, "..", "..", "bin", "youtube-cookies.txt");

function toNetscapeLine(cookie) {
  const domain = cookie.domain.startsWith(".") ? cookie.domain : `.${cookie.domain}`;
  const includeSubdomains = "TRUE";
  const expiration = cookie.session ? 0 : Math.floor(cookie.expirationDate ?? 0);
  return [domain, includeSubdomains, cookie.path || "/", cookie.secure ? "TRUE" : "FALSE", expiration, cookie.name, cookie.value].join("\t");
}

/** Convierte youtube-cookies.json (formato Cookie-Editor) a bin/youtube-cookies.txt (formato Netscape, el que usa yt-dlp) */
function ensureNetscapeCookiesFile() {
  if (!fs.existsSync(JSON_COOKIES_PATH)) return null;

  try {
    const cookies = JSON.parse(fs.readFileSync(JSON_COOKIES_PATH, "utf-8"));
    const lines = ["# Netscape HTTP Cookie File", ...cookies.map(toNetscapeLine)];

    const binDir = path.dirname(NETSCAPE_COOKIES_PATH);
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(NETSCAPE_COOKIES_PATH, lines.join("\n") + "\n");
    return NETSCAPE_COOKIES_PATH;
  } catch (err) {
    console.error("No se pudieron convertir las cookies de YouTube:", err.message);
    return null;
  }
}

module.exports = { ensureNetscapeCookiesFile };
