const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// Airport search
router.get('/airports', flightController.searchAirports);

// Flight search
router.post('/search', flightController.searchFlights);

module.exports = router;