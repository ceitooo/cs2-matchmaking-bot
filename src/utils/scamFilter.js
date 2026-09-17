const URL_REGEX = /https?:\/\/[^\s<>()\[\]"']+/gi;

// Umbrales de "cuenta sospechosa" por nivel de seguridad.
const LEVEL_THRESHOLDS = {
  basico: null, // solo bloquea dominios de la lista negra, sin heurística de cuenta nueva
  medio: { accountAgeMs: 30 * 24 * 60 * 60 * 1000, joinAgeMs: 24 * 60 * 60 * 1000, timeoutMs: 10 * 60 * 1000 },
  estricto: { accountAgeMs: 5 * 365 * 24 * 60 * 60 * 1000, joinAgeMs: 7 * 24 * 60 * 60 * 1000, timeoutMs: 30 * 60 * 1000 }
};

function extractUrls(message) {
  const urls = new Set();
  for (const match of message.content.match(URL_REGEX) ?? []) urls.add(match);
  for (const embed of message.embeds) {
    if (embed.url) urls.add(embed.url);
    if (embed.image?.url) urls.add(embed.image.url);
    if (embed.thumbnail?.url) urls.add(embed.thumbnail.url);
  }
  return [...urls];
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesScamDomain(urls, scamDomains) {
  if (scamDomains.length === 0) return null;
  for (const url of urls) {
    const hostname = extractHostname(url);
    if (!hostname) continue;
    const hit = scamDomains.find((d) => hostname === d.domain || hostname.endsWith(`.${d.domain}`));
    if (hit) return hit.domain;
  }
  return null;
}

function hasImage(message) {
  if (message.attachments.some((a) => a.contentType?.startsWith("image/"))) return true;
  return message.embeds.some((e) => e.image || e.thumbnail);
}

// Cuenta muy nueva y/o se unió al server hace muy poco + mandó un link con
// una imagen: patrón clásico de bots de estafa (casino cripto, nitro falso).
function isSuspiciousNewAccount(member, level) {
  const thresholds = LEVEL_THRESHOLDS[level];
  if (!thresholds) return false;

  const accountAge = Date.now() - member.user.createdTimestamp;
  const joinAge = member.joinedTimestamp ? Date.now() - member.joinedTimestamp : Infinity;

  return accountAge < thresholds.accountAgeMs || joinAge < thresholds.joinAgeMs;
}

function getTimeoutMs(level) {
  return LEVEL_THRESHOLDS[level]?.timeoutMs ?? 10 * 60 * 1000;
}

module.exports = { extractUrls, extractHostname, matchesScamDomain, hasImage, isSuspiciousNewAccount, getTimeoutMs, LEVEL_THRESHOLDS };
