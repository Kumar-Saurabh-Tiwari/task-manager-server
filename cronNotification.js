const admin = require("firebase-admin");

// Schedule notification at a specific time
function scheduleNotification(title, body, token, date) {
  const scheduledTime = new Date(date);
  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  console.log("🔔 Scheduling notification:");
  console.log("→ Current Server Time:", now.toISOString());
  console.log("→ Scheduled Time:", scheduledTime.toISOString());
  console.log("→ Delay (ms):", delay);

  if (isNaN(scheduledTime.getTime())) {
    return console.error("❌ Invalid scheduled time provided.");
  }

  if (delay <= 0) {
    return console.warn("⚠️ Scheduled time is in the past. Notification not scheduled.");
  }

  // Notify after calculated delay
  setTimeout(async () => {
    try {
      const message = {
        notification: { title, body },
        token,
      };

      const response = await admin.messaging().send(message);
      console.log("✅ Notification sent successfully:", response);
    } catch (err) {
      console.error("❌ Error sending notification:", err.message);
    }
  }, delay);
}

module.exports = { scheduleNotification };
