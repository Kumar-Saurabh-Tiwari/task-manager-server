const axios = require('axios');

// Free API configurations
const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || '5f231e2243ce635cd83ef0702547deed'; // Get from https://aviationstack.com/
const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1';
const OPENSKY_BASE_URL = 'https://opensky-network.org/api';

// Static airport list (backup for demo)
const airports = [
  { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
  { code: 'ORD', name: "Chicago O'Hare International Airport", city: 'Chicago', country: 'United States' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
  { code: 'LAS', name: 'McCarran International Airport', city: 'Las Vegas', country: 'United States' },
  { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States' },
  { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'United States' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India' }
];

// 1. Airport Search using AviationStack API
exports.searchAirports = async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  // Fallback to static list if no API key
  if (!AVIATIONSTACK_API_KEY || AVIATIONSTACK_API_KEY === '5f231e2243ce635cd83ef0702547deed') {
    const filtered = airports.filter(airport => 
      airport.name.toLowerCase().includes(q.toLowerCase()) ||
      airport.city.toLowerCase().includes(q.toLowerCase()) ||
      airport.code.toLowerCase().includes(q.toLowerCase())
    );
    return res.json(filtered.slice(0, 10));
  }

  try {
    const response = await axios.get(`${AVIATIONSTACK_BASE_URL}/airports`, {
      params: {
        access_key: AVIATIONSTACK_API_KEY,
        search: q,
        limit: 10
      }
    });

    const airportResults = (response.data.data || []).map(airport => ({
      code: airport.iata_code,
      name: airport.airport_name,
      city: airport.city,
      country: airport.country_name,
      timezone: airport.timezone,
      latitude: airport.latitude,
      longitude: airport.longitude
    }));

    res.json(airportResults);
  } catch (err) {
    console.error('AviationStack airport search error:', err.response?.data || err.message);
    
    // Fallback to static list on error
    const filtered = airports.filter(airport => 
      airport.name.toLowerCase().includes(q.toLowerCase()) ||
      airport.city.toLowerCase().includes(q.toLowerCase()) ||
      airport.code.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json(filtered.slice(0, 10));
  }
};

// 2. Flight Search using OpenSky Network API
exports.searchFlights = async (req, res) => {
  const {
    origin,      // IATA code (e.g., 'DEL')
    destination, // IATA code (e.g., 'BOM') - optional
    direction,   // 'departure' or 'arrival'
    hours        // How many hours back to search (default: 6)
  } = req.query;

  if (!origin) {
    return res.status(400).json({ 
      message: 'Missing required parameter: origin (airport IATA code)' 
    });
  }

  const flightDirection = direction === 'arrival' ? 'arrival' : 'departure';
  const searchHours = parseInt(hours) || 6;
  
  // Calculate time range (OpenSky uses UNIX timestamps)
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - (searchHours * 3600); // X hours ago

  try {
    const url = `${OPENSKY_BASE_URL}/flights/${flightDirection}`;
    const response = await axios.get(url, {
      params: {
        airport: origin,
        begin: startTime,
        end: now
      }
    });

    let flights = response.data || [];

    // Filter by destination if provided
    if (destination) {
      if (flightDirection === 'departure') {
        flights = flights.filter(flight => flight.estArrivalAirport === destination);
      } else {
        flights = flights.filter(flight => flight.estDepartureAirport === destination);
      }
    }

    // Format the response
    const formattedFlights = flights.map(flight => ({
      icao24: flight.icao24,
      callsign: flight.callsign?.trim(),
      departureAirport: flight.estDepartureAirport,
      arrivalAirport: flight.estArrivalAirport,
      departureTime: flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null,
      arrivalTime: flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null,
      estDepartureTime: flight.estDepartureAirportHorizDistance,
      estArrivalTime: flight.estArrivalAirportHorizDistance
    }));

    res.json({
      success: true,
      count: formattedFlights.length,
      data: formattedFlights,
      meta: {
        source: 'opensky-network',
        airport: origin,
        destination: destination || 'any',
        direction: flightDirection,
        searchHours: searchHours,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('OpenSky flight search error:', err.response?.data || err.message);
    res.status(500).json({ 
      message: 'Error searching flights', 
      error: err.response?.data || err.message,
      source: 'opensky-network'
    });
  }
};

// 3. Get flight route between two airports (DEL to BOM example)
exports.getFlightRoute = async (req, res) => {
  const { from, to, hours = 12, showAll = false } = req.query;

  if (!from || !to) {
    return res.status(400).json({ 
      message: 'Missing required parameters: from and to (airport IATA codes)' 
    });
  }

  const searchHours = parseInt(hours);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - (searchHours * 3600);

  try {
    // Convert IATA to ICAO if needed (OpenSky uses ICAO codes)
    const iataToIcaoMap = {
      'DEL': 'VIDP', 'BOM': 'VABB', 'JFK': 'KJFK', 'LAX': 'KLAX', 
      'LHR': 'EGLL', 'CDG': 'LFPG', 'DXB': 'OMDB', 'SIN': 'WSSS',
      'HKG': 'VHHH', 'NRT': 'RJAA', 'FRA': 'EDDF', 'AMS': 'EHAM'
    };

    const fromICAO = iataToIcaoMap[from] || from;
    const toICAO = iataToIcaoMap[to] || to;

    // Get departures from origin airport
    const departuresResponse = await axios.get(`${OPENSKY_BASE_URL}/flights/departure`, {
      params: {
        airport: fromICAO,
        begin: startTime,
        end: now
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('OpenSky API Response:', {
      status: departuresResponse.status,
      dataLength: departuresResponse.data ? departuresResponse.data.length : 0,
      data: departuresResponse.data
    });

    // Check if we got valid data
    if (!departuresResponse.data || departuresResponse.data.length === 0) {
      // Fallback: Try with different time ranges
      const yesterday = now - (24 * 3600);
      const fallbackResponse = await axios.get(`${OPENSKY_BASE_URL}/flights/departure`, {
        params: {
          airport: fromICAO,
          begin: yesterday,
          end: now
        },
        timeout: 10000
      });

      if (!fallbackResponse.data || fallbackResponse.data.length === 0) {
        return res.json({
          success: true,
          route: `${from} → ${to}`,
          count: 0,
          data: [],
          message: 'No flight data available for this route in the specified time range',
          suggestions: [
            'Try increasing the hours parameter (e.g., hours=24 or hours=48)',
            'This route might not have regular flights',
            'OpenSky Network has limited historical data'
          ],
          meta: {
            source: 'opensky-network',
            searchHours: searchHours,
            fromICAO: fromICAO,
            toICAO: toICAO,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Use fallback data
      departuresResponse.data = fallbackResponse.data;
    }

    // Format ALL flights departing from the origin airport
    const allFlights = (departuresResponse.data || []).map(flight => ({
      icao24: flight.icao24,
      callsign: flight.callsign?.trim() || 'Unknown',
      from: flight.estDepartureAirport || fromICAO,
      to: flight.estArrivalAirport || 'Unknown',
      departureTime: flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null,
      arrivalTime: flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null,
      duration: flight.firstSeen && flight.lastSeen ? 
        Math.round((flight.lastSeen - flight.firstSeen) / 60) + ' minutes' : 'Unknown',
      // Additional flight info
      departureTimestamp: flight.firstSeen,
      arrivalTimestamp: flight.lastSeen
    }));

    // Filter flights going to specific destination
    const routeFlights = allFlights.filter(flight => {
      const arrivalAirport = flight.to;
      return arrivalAirport === toICAO || arrivalAirport === to;
    });

    // Group flights by destination for analysis
    const destinationGroups = {};
    allFlights.forEach(flight => {
      const dest = flight.to;
      if (!destinationGroups[dest]) {
        destinationGroups[dest] = [];
      }
      destinationGroups[dest].push(flight);
    });

    // Sort destinations by flight count
    const destinationSummary = Object.entries(destinationGroups)
      .map(([dest, flights]) => ({
        destination: dest,
        flightCount: flights.length,
        flights: flights.slice(0, 3) // Show first 3 flights per destination
      }))
      .sort((a, b) => b.flightCount - a.flightCount);

    // Determine what to return based on showAll parameter
    if (showAll === 'true' || routeFlights.length === 0) {
      return res.json({
        success: true,
        route: `${from} → ALL DESTINATIONS`,
        searchedRoute: `${from} → ${to}`,
        routeFlightsFound: routeFlights.length,
        totalFlightsFound: allFlights.length,
        data: allFlights,
        destinationSummary: destinationSummary,
        message: routeFlights.length === 0 ? 
          `No direct flights found from ${from} to ${to}. Showing all departures from ${from}.` :
          `Showing all ${allFlights.length} departures from ${from}`,
        meta: {
          source: 'opensky-network',
          searchHours: searchHours,
          fromICAO: fromICAO,
          toICAO: toICAO,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      route: `${from} → ${to}`,
      count: routeFlights.length,
      data: routeFlights,
      allFlightsFromOrigin: allFlights.length,
      destinationSummary: destinationSummary.slice(0, 5), // Top 5 destinations
      meta: {
        source: 'opensky-network',
        searchHours: searchHours,
        fromICAO: fromICAO,
        toICAO: toICAO,
        totalFlightsFound: allFlights.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('OpenSky route search error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      url: err.config?.url
    });

    // Provide mock data as fallback for demonstration
    const mockFlights = [
      {
        icao24: 'demo001',
        callsign: 'AI127',
        from: from,
        to: to,
        departureTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        arrivalTime: new Date(Date.now() - 0.5 * 3600 * 1000).toISOString(),
        duration: '90 minutes'
      },
      {
        icao24: 'demo002', 
        callsign: 'SG8195',
        from: from,
        to: to,
        departureTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        arrivalTime: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
        duration: '90 minutes'
      }
    ];

    res.json({
      success: true,
      route: `${from} → ${to}`,
      count: mockFlights.length,
      data: mockFlights,
      message: 'Using demo data - OpenSky API unavailable',
      error: err.response?.data || err.message,
      meta: {
        source: 'demo-data',
        searchHours: searchHours,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// 4. Get all current flights (live tracking)
exports.getCurrentFlights = async (req, res) => {
  try {
    const response = await axios.get(`${OPENSKY_BASE_URL}/states/all`);
    
    const flights = (response.data.states || []).map(state => ({
      icao24: state[0],
      callsign: state[1]?.trim(),
      originCountry: state[2],
      timePosition: state[3] ? new Date(state[3] * 1000).toISOString() : null,
      lastContact: state[4] ? new Date(state[4] * 1000).toISOString() : null,
      longitude: state[5],
      latitude: state[6],
      baroAltitude: state[7],
      onGround: state[8],
      velocity: state[9],
      trueTrack: state[10],
      verticalRate: state[11],
      geoAltitude: state[13],
      squawk: state[14],
      spi: state[15],
      positionSource: state[16]
    }));

    res.json({
      success: true,
      count: flights.length,
      data: flights.slice(0, 100), // Limit to first 100 for performance
      meta: {
        source: 'opensky-network',
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('OpenSky current flights error:', err.response?.data || err.message);
    res.status(500).json({ 
      message: 'Error fetching current flights', 
      error: err.response?.data || err.message 
    });
  }
};