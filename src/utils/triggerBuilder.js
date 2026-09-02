const { createCanvas, loadImage } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");

const SIZE = 200;
const FRAMES = 10;
const ZOOM = 1.5;
const SHAKE = 14;

async function buildTriggerGif(imageUrl, { withText = false } = {}) {
  const avatar = await loadImage(imageUrl);

  const encoder = new GIFEncoder(SIZE, SIZE, "neuquant", true);
  encoder.setDelay(35);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.start();

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  const drawSize = SIZE * ZOOM;

  for (let i = 0; i < FRAMES; i++) {
    const offsetX = (Math.random() - 0.5) * SHAKE - (drawSize - SIZE) / 2;
    const offsetY = (Math.random() - 0.5) * SHAKE - (drawSize - SIZE) / 2;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(avatar, offsetX, offsetY, drawSize, drawSize);

    // Tinte rojo pulsante
    ctx.fillStyle = `rgba(255, 0, 0, ${0.15 + Math.random() * 0.2})`;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (withText) {
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterY = (Math.random() - 0.5) * 6;

      ctx.fillStyle = "#000000";
      ctx.fillText("TRIGGERED", SIZE / 2 + jitterX + 2, SIZE - 16 + jitterY + 2);
      ctx.fillStyle = "#ff0000";
      ctx.fillText("TRIGGERED", SIZE / 2 + jitterX, SIZE - 16 + jitterY);
    }

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = { buildTriggerGif };
