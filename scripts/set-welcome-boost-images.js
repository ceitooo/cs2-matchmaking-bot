require("dotenv").config();
const path = require("node:path");
const fs = require("node:fs");
const { updateGuildSettings } = require("../src/db/database");

const GUILD_ID = process.env.GUILD_ID;
const assetsDir = path.join(__dirname, "..", "data", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const SOURCES = [
  { kind: "welcome", from: "C:/Users/holad/Downloads/welcome.png", field: "welcome_image_url" },
  { kind: "boost", from: "C:/Users/holad/Downloads/boostty.png", field: "boost_image_url" }
];

for (const src of SOURCES) {
  if (!fs.existsSync(src.from)) {
    console.log(`No encontré ${src.from}`);
    continue;
  }
  const ext = path.extname(src.from).toLowerCase();
  const fileName = `${GUILD_ID}-${src.kind}${ext}`;
  const dest = path.join(assetsDir, fileName);
  fs.copyFileSync(src.from, dest);
  updateGuildSettings(GUILD_ID, { [src.field]: fileName });
  console.log(`${src.kind} -> ${fileName}`);
}

console.log("Listo.");
process.exit(0);
