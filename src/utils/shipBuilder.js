const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 500;
const HEIGHT = 260;
const AVATAR_SIZE = 220;

function compatibilidad(idA, idB) {
  const combined = [idA, idB].sort().join("");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 100000;
  }
  return hash % 101;
}

function drawHeart(ctx, cx, cy, size) {
  ctx.save();
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + topCurveHeight);
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + topCurveHeight);
  ctx.bezierCurveTo(cx - size / 2, cy + (size + topCurveHeight) / 2, cx, cy + (size + topCurveHeight) / 2, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + topCurveHeight);
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + topCurveHeight);
  ctx.closePath();
  ctx.fillStyle = "#ff4d6d";
  ctx.fill();
  ctx.restore();
}

function drawCircleAvatar(ctx, image, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
}

async function buildShipImage(avatarUrlA, avatarUrlB, idA, idB) {
  const [imgA, imgB] = await Promise.all([loadImage(avatarUrlA), loadImage(avatarUrlB)]);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, WIDTH, 0);
  bg.addColorStop(0, "#2b1331");
  bg.addColorStop(1, "#3a0f1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const avatarY = 20;
  drawCircleAvatar(ctx, imgA, 10, avatarY, AVATAR_SIZE);
  drawCircleAvatar(ctx, imgB, WIDTH - AVATAR_SIZE - 10, avatarY, AVATAR_SIZE);

  drawHeart(ctx, WIDTH / 2, HEIGHT / 2 - 60, 70);

  const porcentaje = compatibilidad(idA, idB);

  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${porcentaje}%`, WIDTH / 2, HEIGHT - 40);

  const barWidth = 200;
  const barX = WIDTH / 2 - barWidth / 2;
  const barY = HEIGHT - 25;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(barX, barY, barWidth, 12);
  ctx.fillStyle = "#ff4d6d";
  ctx.fillRect(barX, barY, (barWidth * porcentaje) / 100, 12);

  return { buffer: canvas.toBuffer("image/png"), porcentaje };
}

module.exports = { buildShipImage, compatibilidad };
