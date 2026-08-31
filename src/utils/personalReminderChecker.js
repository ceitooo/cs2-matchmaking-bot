const { getDuePersonalReminders, markPersonalReminderSent } = require("../db/database");

const CHECK_INTERVAL_MS = 60 * 1000; // cada 1 minuto

async function checkPersonalReminders(client) {
  const due = getDuePersonalReminders();

  for (const reminder of due) {
    markPersonalReminderSent(reminder.id);

    const user = await client.users.fetch(reminder.user_id).catch(() => null);
    if (!user) continue;

    await user.send(`⏰ Te dijiste que te recuerde: "${reminder.message}"`).catch(() => {});
  }
}

function startPersonalReminderChecker(client) {
  checkPersonalReminders(client).catch((e) => console.error("[recordarme] Error:", e.message));
  setInterval(() => {
    checkPersonalReminders(client).catch((e) => console.error("[recordarme] Error:", e.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startPersonalReminderChecker };
