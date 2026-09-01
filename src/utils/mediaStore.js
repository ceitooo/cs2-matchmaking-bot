const path = require("node:path");
const fs = require("node:fs");

const assetsDir = path.join(__dirname, "..", "..", "data", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function extensionFromUrl(url) {
  const clean = url.split("?")[0];
  const ext = path.extname(clean).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
}

// Las URLs de adjuntos de Discord expiran (vienen firmadas con ?ex=...), así que
// bajamos el archivo a disco y guardamos la ruta local en vez del link.
async function saveMediaAsset(url, guildId, kind) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No pude descargar la imagen (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const filePath = path.join(assetsDir, `${guildId}-${kind}${extensionFromUrl(url)}`);

  for (const old of fs.readdirSync(assetsDir).filter((f) => f.startsWith(`${guildId}-${kind}.`))) {
    fs.unlinkSync(path.join(assetsDir, old));
  }

  fs.writeFileSync(filePath, buffer);
  // Guardamos solo el nombre: la ruta absoluta cambia entre Windows y el hosting Linux.
  return path.basename(filePath);
}

function isLocalAsset(value) {
  return Boolean(value) && !value.startsWith("http://") && !value.startsWith("https://");
}

// Devuelve { image, files } listo para meter en un embed: si es archivo local usa
// attachment://, si es una URL externa la deja tal cual.
function resolveMedia(value) {
  if (!value) return { image: null, files: [] };
  if (!isLocalAsset(value)) return { image: value, files: [] };

  const name = path.basename(value);
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) return { image: null, files: [] };

  return { image: `attachment://${name}`, files: [{ attachment: filePath, name }] };
}

module.exports = { saveMediaAsset, resolveMedia, isLocalAsset };
