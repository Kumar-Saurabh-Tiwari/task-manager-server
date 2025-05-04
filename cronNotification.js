// cronNotification.js

const cron = require("node-cron");
const admin = require("firebase-admin");

// Example: send at a specific date/time
function scheduleNotification(title, body, token, date) {
  const taskTime = new Date(date);

  const now = new Date();
  const delay = taskTime - now;

  if (delay <= 0) return console.error("Scheduled time is in the past");

  setTimeout(() => {
    admin.messaging().send({
      notification: { title, body },
      token,
    })
    .then((res) => console.log("Scheduled notification sent", res))
    .catch(console.error);
  }, delay);
}

module.exports = { scheduleNotification };
