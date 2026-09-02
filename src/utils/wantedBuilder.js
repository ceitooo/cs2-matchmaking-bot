const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 320;
const HEIGHT = 420;
const AVATAR_SIZE = 240;

async function buildWantedImage(avatarUrl, username) {
  const avatar = await loadImage(avatarUrl);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e8c988";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#3b2a17";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, WIDTH - 10, HEIGHT - 10);

  ctx.textAlign = "center";
  ctx.fillStyle = "#3b2a17";
  ctx.font = "bold 44px serif";
  ctx.fillText("SE BUSCA", WIDTH / 2, 60);

  const avatarX = (WIDTH - AVATAR_SIZE) / 2;
  const avatarY = 80;
  ctx.save();
  ctx.filter = "sepia(1) contrast(1.1)";
  ctx.drawImage(avatar, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();
  ctx.strokeStyle = "#3b2a17";
  ctx.lineWidth = 4;
  ctx.strokeRect(avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);

  ctx.font = "bold 26px serif";
  ctx.fillText(username.toUpperCase(), WIDTH / 2, avatarY + AVATAR_SIZE + 45);

  ctx.font = "20px serif";
  ctx.fillText("RECOMPENSA: $999,999", WIDTH / 2, avatarY + AVATAR_SIZE + 80);

  return canvas.toBuffer("image/png");
}

module.exports = { buildWantedImage };
