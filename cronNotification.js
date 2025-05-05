// cronNotification.js

const cron = require("node-cron");
const admin = require("firebase-admin");

// Example: send at a specific date/time
function scheduleNotification(title, body, token, date) {
  const scheduledTime = new Date(date);
  const now = new Date();
  const delay = scheduledTime - now;

  if (delay <= 0) return console.error("Scheduled time is in the past");

  console.log(`Notification scheduled in ${delay / 1000}s`);

  setTimeout(async () => {
    try {
      const response = await admin.messaging().send({
        notification: { title, body },
        token,
      });
      console.log("Notification sent successfully:", response);
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  }, delay);
}


module.exports = { scheduleNotification };
