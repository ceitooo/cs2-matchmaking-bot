const { createCanvas, loadImage } = require("@napi-rs/canvas");

const SIZE = 256;
const BAR_COUNT = 6;
const BAR_WIDTH = 14;

async function buildJailImage(imageUrl) {
  const source = await loadImage(imageUrl);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, SIZE, SIZE);

  // Oscurece un poco el fondo para que las rejas resalten
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const gap = SIZE / BAR_COUNT;
  for (let i = 0; i < BAR_COUNT; i++) {
    const x = i * gap + gap / 2 - BAR_WIDTH / 2;

    const gradient = ctx.createLinearGradient(x, 0, x + BAR_WIDTH, 0);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(0.5, "#555555");
    gradient.addColorStop(1, "#0a0a0a");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, BAR_WIDTH, SIZE);
  }

  // Barra horizontal arriba y abajo
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, SIZE, 10);
  ctx.fillRect(0, SIZE - 10, SIZE, 10);

  return canvas.toBuffer("image/png");
}

module.exports = { buildJailImage };
