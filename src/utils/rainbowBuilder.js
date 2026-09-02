const { createCanvas, loadImage } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");

const SIZE = 200;
const FRAMES = 20;

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Colorea por brillo (luminancia) en vez de mezclar con el color original: así se
// ve el arcoíris aunque el avatar sea oscuro, en blanco y negro o poco saturado.
async function buildRainbowGif(avatarUrl) {
  const avatar = await loadImage(avatarUrl);

  const srcCanvas = createCanvas(SIZE, SIZE);
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.drawImage(avatar, 0, 0, SIZE, SIZE);
  const srcData = srcCtx.getImageData(0, 0, SIZE, SIZE).data;

  const luminance = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < luminance.length; i++) {
    const o = i * 4;
    luminance[i] = (0.299 * srcData[o] + 0.587 * srcData[o + 1] + 0.114 * srcData[o + 2]) / 255;
  }

  const encoder = new GIFEncoder(SIZE, SIZE, "neuquant", true);
  encoder.setDelay(45);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.start();

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  const frameImage = ctx.createImageData(SIZE, SIZE);

  for (let f = 0; f < FRAMES; f++) {
    const baseHue = (f / FRAMES) * 360;

    for (let i = 0; i < luminance.length; i++) {
      const o = i * 4;
      const alpha = srcData[o + 3];

      if (alpha === 0) {
        frameImage.data[o + 3] = 0;
        continue;
      }

      // El tono varía a lo ancho de la imagen (barrido tipo arcoíris) y rota con el tiempo
      const x = i % SIZE;
      const hue = baseHue + (x / SIZE) * 360;
      const l = 0.15 + luminance[i] * 0.7; // conserva algo de sombra/luz del original

      const [r, g, b] = hslToRgb(hue, 0.85, l);

      frameImage.data[o] = r;
      frameImage.data[o + 1] = g;
      frameImage.data[o + 2] = b;
      frameImage.data[o + 3] = alpha;
    }

    ctx.putImageData(frameImage, 0, 0);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = { buildRainbowGif };
