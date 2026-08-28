// Descarga el binario oficial de yt-dlp (auto-contenido, sin necesitar Python) para esta plataforma.
// Se corre automáticamente después de "npm install" (ver "postinstall" en package.json).
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const binDir = path.join(__dirname, "..", "bin");
const isWindows = process.platform === "win32";
const fileName = isWindows ? "yt-dlp.exe" : "yt-dlp";
const destPath = path.join(binDir, fileName);

const RELEASE_URL = isWindows
  ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
  : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          return resolve(download(res.headers.location, dest, redirectsLeft - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Descarga falló con status ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

(async () => {
  if (fs.existsSync(destPath)) {
    console.log("yt-dlp ya está descargado, se omite.");
    return;
  }

  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

  console.log(`Descargando yt-dlp desde ${RELEASE_URL} ...`);
  await download(RELEASE_URL, destPath);

  if (!isWindows) {
    fs.chmodSync(destPath, 0o755);
  }

  console.log("yt-dlp descargado en", destPath);
})().catch((err) => {
  console.error("No se pudo descargar yt-dlp:", err.message);
  // no interrumpimos el install completo por esto
});
