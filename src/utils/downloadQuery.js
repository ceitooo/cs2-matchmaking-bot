const DOWNLOAD_URL = "https://ceitotweaks.com/";
const REPLY_MESSAGE = `📥 Podés descargar el programa desde acá: ${DOWNLOAD_URL}`;

function normalizeText(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDownloadQuery(rawContent) {
  if (!rawContent || typeof rawContent !== "string") return false;
  if (rawContent.includes("ceitotweaks.com") || rawContent.includes("ceitotweaks-web.vercel.app")) return false;

  const text = normalizeText(rawContent);
  if (text.length < 5) return false;

  // 1. "donde / where..." + descargar/bajar/conseguir/obtener/instalar/download
  if (/\b(?:donde|where)\b.*?\b(?:descarg|bajar|bajo|baja|conseguir|obtener|instalar|download)/.test(text)) return true;

  // 2. "como / how to..." + descargar/bajar/instalar/download
  if (/\b(?:como|how)\b.*?\b(?:descarg|bajar|bajo|baja|instalar|download)/.test(text)) return true;

  // 3. Link/pagina/web/url + descarga/programa/ceitotweaks/download
  if (/\b(?:link|pagina|web|sitio|url)\b.*?\b(?:descarg|programa|ceitotweaks|tweak|download)/.test(text)) return true;

  // 4. "pasen / pasa / pasame / send" + programa / descarga / link
  if (/\b(?:pasen|pasa|pasame|pasan|send)\b.*?\b(?:link|pagina|web|descarg|programa|ceitotweaks|download)/.test(text)) return true;

  // 5. "donde esta el programa / la descarga / ceitotweaks"
  if (/\b(?:donde|where)\s+(?:esta|is|consigo|encuentro)\b.*?\b(?:programa|descarga|ceitotweaks|app|archivo)/.test(text)) return true;

  return false;
}

module.exports = {
  DOWNLOAD_URL,
  REPLY_MESSAGE,
  isDownloadQuery
};
