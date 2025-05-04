// routes/notifications.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');
const { scheduleNotification } = require('../cronNotification');

router.post("/schedule", async (req, res) => {
  const { title, body, token, scheduledTime } = req.body;

  try {
    scheduleNotification(title, body, token, scheduledTime);
    res.json({ success: true, message: "Notification scheduled" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export the router
module.exports = router;
