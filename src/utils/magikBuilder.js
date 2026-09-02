const { createCanvas, loadImage } = require("@napi-rs/canvas");

const SIZE = 256;

// Deforma la imagen con ondas sinusoidales de fase/frecuencia random, simulando
// el efecto "liquid rescale" clásico del magik de ImageMagick.
async function buildMagikImage(imageUrl) {
  const source = await loadImage(imageUrl);

  const srcCanvas = createCanvas(SIZE, SIZE);
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.drawImage(source, 0, 0, SIZE, SIZE);
  const srcData = srcCtx.getImageData(0, 0, SIZE, SIZE).data;

  const outCanvas = createCanvas(SIZE, SIZE);
  const outCtx = outCanvas.getContext("2d");
  const outImage = outCtx.createImageData(SIZE, SIZE);
  const outData = outImage.data;

  const waves = Array.from({ length: 4 }, () => ({
    axis: Math.random() < 0.5 ? "x" : "y",
    amplitude: 6 + Math.random() * 14,
    frequency: 0.02 + Math.random() * 0.05,
    phase: Math.random() * Math.PI * 2
  }));

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sx = x;
      let sy = y;

      for (const wave of waves) {
        if (wave.axis === "x") {
          sx += Math.sin(y * wave.frequency + wave.phase) * wave.amplitude;
        } else {
          sy += Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
        }
      }

      sx = Math.max(0, Math.min(SIZE - 1, Math.round(sx)));
      sy = Math.max(0, Math.min(SIZE - 1, Math.round(sy)));

      const srcIndex = (sy * SIZE + sx) * 4;
      const outIndex = (y * SIZE + x) * 4;

      outData[outIndex] = srcData[srcIndex];
      outData[outIndex + 1] = srcData[srcIndex + 1];
      outData[outIndex + 2] = srcData[srcIndex + 2];
      outData[outIndex + 3] = srcData[srcIndex + 3];
    }
  }

  outCtx.putImageData(outImage, 0, 0);
  return outCanvas.toBuffer("image/png");
}

module.exports = { buildMagikImage };
