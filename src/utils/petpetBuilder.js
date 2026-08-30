const path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");

const SIZE = 128;
const FRAMES = 10;
const handFramesPath = path.join(__dirname, "..", "..", "assets", "petpet");

let handFramesCache = null;
async function getHandFrames() {
  if (handFramesCache) return handFramesCache;
  handFramesCache = await Promise.all(
    Array.from({ length: FRAMES }, (_, i) => loadImage(path.join(handFramesPath, `pet${i}.gif`)))
  );
  return handFramesCache;
}

async function buildPetpetGif(avatarUrl) {
  const [avatar, handFrames] = await Promise.all([loadImage(avatarUrl), getHandFrames()]);

  const encoder = new GIFEncoder(SIZE, SIZE, "neuquant", true);
  encoder.setDelay(20);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.setTransparent(0x00000000);
  encoder.start();

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < FRAMES; i++) {
    const j = i < FRAMES / 2 ? i : FRAMES - i;

    const width = 0.8 + j * 0.02;
    const height = 0.8 - j * 0.05;
    const offsetX = (1 - width) * 0.5 + 0.1;
    const offsetY = 1 - height - 0.08;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(avatar, SIZE * offsetX, SIZE * offsetY, SIZE * width, SIZE * height);
    ctx.drawImage(handFrames[i], 0, 0, SIZE, SIZE);

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = { buildPetpetGif };
