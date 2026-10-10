const CHECK_INTERVAL_MS = 60 * 1000; // cada 1 minuto
const CHANNEL_NAME = "staff-chat";
const TIMEZONE = "America/Argentina/Buenos_Aires";
const HOUR = 18; // 6 de la tarde

let lastSentDate = null;

function nowInTz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) };
}

async function checkHostingReminder(client) {
  const { date, hour } = nowInTz();
  if (hour !== HOUR || lastSentDate === date) return;

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const channel = guild?.channels.cache.find((c) => c.name === CHANNEL_NAME && c.isTextBased());
  if (!channel) return console.error(`[hosting-reminder] No encontré el canal #${CHANNEL_NAME}`);

  lastSentDate = date;
  await channel.send(
    "⏰ **Recordatorio diario:** reactivar el bot en **bot-hosting.net** (plan Free), si no se apaga y se borra el servidor.\nhttps://bot-hosting.net"
  );
}

function startHostingReminder(client) {
  setInterval(() => {
    checkHostingReminder(client).catch((e) => console.error("[hosting-reminder] Error:", e.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startHostingReminder };
