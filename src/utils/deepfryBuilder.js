const { createCanvas, loadImage } = require("@napi-rs/canvas");

const SIZE = 256;

function clamp(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

async function buildDeepfryImage(imageUrl) {
  const source = await loadImage(imageUrl);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, SIZE, SIZE);

  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = image.data;

  const CONTRAST = 2.4;
  const SATURATION = 2.2;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contraste
    r = clamp((r - 128) * CONTRAST + 128);
    g = clamp((g - 128) * CONTRAST + 128);
    b = clamp((b - 128) * CONTRAST + 128);

    // Saturación (empuja cada canal lejos del gris promedio)
    const gray = (r + g + b) / 3;
    r = clamp(gray + (r - gray) * SATURATION);
    g = clamp(gray + (g - gray) * SATURATION);
    b = clamp(gray + (b - gray) * SATURATION);

    // Tinte amarillo/rojo típico del deepfry
    r = clamp(r + 25);
    g = clamp(g + 8);
    b = clamp(b - 15);

    // Ruido
    const noise = (Math.random() - 0.5) * 40;
    r = clamp(r + noise);
    g = clamp(g + noise);
    b = clamp(b + noise);

    // Posterización (reduce profundidad de color)
    const levels = 5;
    r = clamp(Math.round((r / 255) * levels) * (255 / levels));
    g = clamp(Math.round((g / 255) * levels) * (255 / levels));
    b = clamp(Math.round((b / 255) * levels) * (255 / levels));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toBuffer("image/jpeg", 20);
}

module.exports = { buildDeepfryImage };
