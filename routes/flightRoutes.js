const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// Airport search
router.get('/airports', flightController.searchAirports);

// Flight search
router.get('/search', flightController.searchFlights);


// Flight search
router.get('/get-route', flightController.getFlightRoute);

module.exports = router;