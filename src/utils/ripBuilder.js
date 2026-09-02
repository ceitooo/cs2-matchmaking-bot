const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 300;
const HEIGHT = 340;
const AVATAR_SIZE = 130;

async function buildRipImage(avatarUrl, username) {
  const avatar = await loadImage(avatarUrl);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#1a1a2e");
  sky.addColorStop(1, "#3a3a4a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(0, HEIGHT - 40, WIDTH, 40);

  // Lápida
  const stoneX = WIDTH / 2 - 90;
  const stoneY = 60;
  const stoneW = 180;
  const stoneH = 220;

  ctx.fillStyle = "#8a8a8a";
  ctx.beginPath();
  ctx.moveTo(stoneX, stoneY + stoneH);
  ctx.lineTo(stoneX, stoneY + 40);
  ctx.arc(stoneX + stoneW / 2, stoneY + 40, stoneW / 2, Math.PI, 0);
  ctx.lineTo(stoneX + stoneW, stoneY + stoneH);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, stoneY + 70, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, WIDTH / 2 - AVATAR_SIZE / 2, stoneY + 5, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#2a2a2a";
  ctx.font = "bold 26px serif";
  ctx.fillText("R.I.P.", WIDTH / 2, stoneY + 160);

  ctx.font = "16px serif";
  ctx.fillText(username, WIDTH / 2, stoneY + 190);

  return canvas.toBuffer("image/png");
}

module.exports = { buildRipImage };
