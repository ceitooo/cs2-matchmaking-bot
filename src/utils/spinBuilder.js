const { createCanvas, loadImage } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");

const SIZE = 200;
const FRAMES = 20;

async function buildSpinGif(avatarUrl) {
  const avatar = await loadImage(avatarUrl);

  const encoder = new GIFEncoder(SIZE, SIZE, "neuquant", true);
  encoder.setDelay(30);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.setTransparent(0x00000000);
  encoder.start();

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  const center = SIZE / 2;

  for (let i = 0; i < FRAMES; i++) {
    const angle = (i / FRAMES) * Math.PI * 2;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.drawImage(avatar, -center, -center, SIZE, SIZE);
    ctx.restore();

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = { buildSpinGif };
