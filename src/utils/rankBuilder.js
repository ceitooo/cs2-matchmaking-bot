const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 600;
const HEIGHT = 180;
const AVATAR_SIZE = 120;

async function buildRankCard({ avatarUrl, username, level, xp, threshold, rank }) {
  const avatar = await loadImage(avatarUrl);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#1f1030");
  bg.addColorStop(1, "#2d1b3d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const avatarX = 30;
  const avatarY = (HEIGHT - AVATAR_SIZE) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  const textX = avatarX + AVATAR_SIZE + 30;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(username, textX, 60);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#c9b8e0";
  ctx.textAlign = "right";
  ctx.fillText(`RANK #${rank}`, WIDTH - 30, 45);
  ctx.fillText(`NIVEL ${level}`, WIDTH - 30, 70);

  const barWidth = WIDTH - textX - 30;
  const barX = textX;
  const barY = 100;
  const progress = Math.min(1, xp / threshold);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(barX, barY, barWidth, 24);
  const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  barGradient.addColorStop(0, "#ff4d6d");
  barGradient.addColorStop(1, "#9b59b6");
  ctx.fillStyle = barGradient;
  ctx.fillRect(barX, barY, barWidth * progress, 24);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`${xp} / ${threshold} XP`, barX + barWidth / 2, barY + 17);

  return canvas.toBuffer("image/png");
}

module.exports = { buildRankCard };
