const { createCanvas, loadImage } = require("@napi-rs/canvas");

const SIZE = 256;

async function buildWastedImage(avatarUrl) {
  const avatar = await loadImage(avatarUrl);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(avatar, 0, 0, SIZE, SIZE);

  // Escala de grises + oscurecido
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    data[i] = gray * 0.6;
    data[i + 1] = gray * 0.6;
    data[i + 2] = gray * 0.6;
  }
  ctx.putImageData(image, 0, 0);

  ctx.textAlign = "center";
  ctx.font = "bold 46px serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("WASTED", SIZE / 2, SIZE / 2 + 16);

  return canvas.toBuffer("image/png");
}

module.exports = { buildWastedImage };
