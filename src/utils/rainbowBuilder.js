const { createCanvas, loadImage } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");

const SIZE = 200;
const FRAMES = 20;

async function buildRainbowGif(avatarUrl) {
  const avatar = await loadImage(avatarUrl);

  const encoder = new GIFEncoder(SIZE, SIZE, "neuquant", true);
  encoder.setDelay(40);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.start();

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < FRAMES; i++) {
    const hue = Math.round((i / FRAMES) * 360);

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(avatar, 0, 0, SIZE, SIZE);

    ctx.globalCompositeOperation = "hue";
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = "source-over";

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = { buildRainbowGif };
