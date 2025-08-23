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
  const { from, to, hours = 12, showAll = false, date } = req.query;

  if (!from || !to) {
    return res.status(400).json({ 
      message: 'Missing required parameters: from and to (airport IATA codes)' 
    });
  }

  const searchHours = parseInt(hours);

  try {
    // First, try AviationStack API for comprehensive flight data
    if (AVIATIONSTACK_API_KEY && AVIATIONSTACK_API_KEY !== 'YOUR_AVIATIONSTACK_API_KEY') {
      try {
        // Get flight schedules from AviationStack
        const flightResponse = await axios.get(`${AVIATIONSTACK_BASE_URL}/flights`, {
          params: {
            access_key: AVIATIONSTACK_API_KEY,
            dep_iata: from,
            arr_iata: to,
            limit: 50
          },
          timeout: 15000
        });

        console.log('AviationStack Flight Response:', {
          status: flightResponse.status,
          dataLength: flightResponse.data?.data?.length || 0,
          pagination: flightResponse.data?.pagination
        });

        if (flightResponse.data?.data && flightResponse.data.data.length > 0) {
          const flights = flightResponse.data.data.map(flight => ({
            flightNumber: flight.flight?.iata || flight.flight?.icao || 'Unknown',
            callsign: flight.flight?.icao,
            airline: {
              name: flight.airline?.name,
              iata: flight.airline?.iata,
              icao: flight.airline?.icao
            },
            from: {
              airport: flight.departure?.airport,
              iata: flight.departure?.iata,
              icao: flight.departure?.icao,
              terminal: flight.departure?.terminal,
              gate: flight.departure?.gate,
              scheduled: flight.departure?.scheduled,
              estimated: flight.departure?.estimated,
              actual: flight.departure?.actual,
              timezone: flight.departure?.timezone
            },
            to: {
              airport: flight.arrival?.airport,
              iata: flight.arrival?.iata,
              icao: flight.arrival?.icao,
              terminal: flight.arrival?.terminal,
              gate: flight.arrival?.gate,
              scheduled: flight.arrival?.scheduled,
              estimated: flight.arrival?.estimated,
              actual: flight.arrival?.actual,
              timezone: flight.arrival?.timezone
            },
            aircraft: {
              registration: flight.aircraft?.registration,
              iata: flight.aircraft?.iata,
              icao: flight.aircraft?.icao
            },
            status: flight.flight_status,
            duration: this.calculateDuration(flight.departure?.scheduled, flight.arrival?.scheduled),
            // Mock pricing (AviationStack free tier doesn't include pricing)
            pricing: {
              economy: {
                price: Math.floor(Math.random() * (15000 - 3000) + 3000), // ₹3000-15000
                currency: 'INR',
                availability: Math.floor(Math.random() * 50) + 1
              },
              business: {
                price: Math.floor(Math.random() * (45000 - 18000) + 18000), // ₹18000-45000
                currency: 'INR',
                availability: Math.floor(Math.random() * 10) + 1
              }
            }
          }));

          return res.json({
            success: true,
            route: `${from} → ${to}`,
            count: flights.length,
            data: flights,
            meta: {
              source: 'aviationstack',
              searchHours: searchHours,
              timestamp: new Date().toISOString(),
              pagination: flightResponse.data.pagination
            }
          });
        }
      } catch (aviationError) {
        console.error('AviationStack error:', aviationError.response?.data || aviationError.message);
      }
    }

    // Fallback to OpenSky with timeout handling
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (searchHours * 3600);

    const iataToIcaoMap = {
      'DEL': 'VIDP', 'BOM': 'VABB', 'JFK': 'KJFK', 'LAX': 'KLAX', 
      'LHR': 'EGLL', 'CDG': 'LFPG', 'DXB': 'OMDB', 'SIN': 'WSSS',
      'HKG': 'VHHH', 'NRT': 'RJAA', 'FRA': 'EDDF', 'AMS': 'EHAM'
    };

    const fromICAO = iataToIcaoMap[from] || from;
    const toICAO = iataToIcaoMap[to] || to;

    try {
      const departuresResponse = await axios.get(`${OPENSKY_BASE_URL}/flights/departure`, {
        params: {
          airport: fromICAO,
          begin: startTime,
          end: now
        },
        timeout: 8000 // Reduced timeout
      });

      if (departuresResponse.data && departuresResponse.data.length > 0) {
        const allFlights = departuresResponse.data.map(flight => ({
          icao24: flight.icao24,
          callsign: flight.callsign?.trim() || 'Unknown',
          from: flight.estDepartureAirport || fromICAO,
          to: flight.estArrivalAirport || 'Unknown',
          departureTime: flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null,
          arrivalTime: flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null,
          duration: flight.firstSeen && flight.lastSeen ? 
            Math.round((flight.lastSeen - flight.firstSeen) / 60) + ' minutes' : 'Unknown',
          // Add mock pricing to OpenSky data
          pricing: {
            economy: {
              price: Math.floor(Math.random() * (12000 - 4000) + 4000),
              currency: 'INR',
              availability: Math.floor(Math.random() * 30) + 1
            },
            business: {
              price: Math.floor(Math.random() * (35000 - 15000) + 15000),
              currency: 'INR',
              availability: Math.floor(Math.random() * 8) + 1
            }
          }
        }));

        const routeFlights = allFlights.filter(flight => 
          flight.to === toICAO || flight.to === to
        );

        if (routeFlights.length > 0) {
          return res.json({
            success: true,
            route: `${from} → ${to}`,
            count: routeFlights.length,
            data: routeFlights,
            meta: {
              source: 'opensky-network',
              searchHours: searchHours,
              fromICAO: fromICAO,
              toICAO: toICAO,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    } catch (openskyError) {
      console.error('OpenSky timeout or error:', openskyError.message);
    }

    // Enhanced realistic mock data with pricing
    const mockFlights = [
      {
        flightNumber: 'AI127',
        airline: {
          name: 'Air India',
          iata: 'AI',
          icao: 'AIC'
        },
        from: {
          airport: from === 'DEL' ? 'Indira Gandhi International Airport' : 'Chhatrapati Shivaji Maharaj International Airport',
          iata: from,
          scheduled: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          terminal: from === 'DEL' ? 'T3' : 'T2'
        },
        to: {
          airport: to === 'BOM' ? 'Chhatrapati Shivaji Maharaj International Airport' : 'Indira Gandhi International Airport',
          iata: to,
          scheduled: new Date(Date.now() + 4.5 * 3600 * 1000).toISOString(),
          terminal: to === 'BOM' ? 'T2' : 'T3'
        },
        status: 'scheduled',
        duration: '2h 30m',
        pricing: {
          economy: {
            price: 4500,
            currency: 'INR',
            availability: 23,
            class: 'Economy'
          },
          premium: {
            price: 8900,
            currency: 'INR', 
            availability: 12,
            class: 'Premium Economy'
          },
          business: {
            price: 18500,
            currency: 'INR',
            availability: 4,
            class: 'Business'
          }
        }
      },
      {
        flightNumber: 'SG8195',
        airline: {
          name: 'SpiceJet',
          iata: 'SG',
          icao: 'SEJ'
        },
        from: {
          airport: from === 'DEL' ? 'Indira Gandhi International Airport' : 'Chhatrapati Shivaji Maharaj International Airport',
          iata: from,
          scheduled: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
          terminal: from === 'DEL' ? 'T1' : 'T1'
        },
        to: {
          airport: to === 'BOM' ? 'Chhatrapati Shivaji Maharaj International Airport' : 'Indira Gandhi International Airport',
          iata: to,
          scheduled: new Date(Date.now() + 7.5 * 3600 * 1000).toISOString(),
          terminal: to === 'BOM' ? 'T1' : 'T1'
        },
        status: 'scheduled',
        duration: '2h 30m',
        pricing: {
          economy: {
            price: 3200,
            currency: 'INR',
            availability: 45,
            class: 'Economy'
          },
          business: {
            price: 12800,
            currency: 'INR',
            availability: 8,
            class: 'Business'
          }
        }
      },
      {
        flightNumber: '6E2134',
        airline: {
          name: 'IndiGo',
          iata: '6E',
          icao: 'IGO'
        },
        from: {
          airport: from === 'DEL' ? 'Indira Gandhi International Airport' : 'Chhatrapati Shivaji Maharaj International Airport',
          iata: from,
          scheduled: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
          terminal: from === 'DEL' ? 'T1' : 'T1'
        },
        to: {
          airport: to === 'BOM' ? 'Chhatrapati Shivaji Maharaj International Airport' : 'Indira Gandhi International Airport',
          iata: to,
          scheduled: new Date(Date.now() + 10.5 * 3600 * 1000).toISOString(),
          terminal: to === 'BOM' ? 'T1' : 'T1'
        },
        status: 'scheduled',
        duration: '2h 30m',
        pricing: {
          economy: {
            price: 3800,
            currency: 'INR',
            availability: 38,
            class: 'Economy'
          },
          business: {
            price: 15200,
            currency: 'INR',
            availability: 6,
            class: 'Business'
          }
        }
      }
    ];

    res.json({
      success: true,
      route: `${from} → ${to}`,
      count: mockFlights.length,
      data: mockFlights,
      message: 'Showing realistic demo data with pricing - Live APIs unavailable',
      meta: {
        source: 'enhanced-demo-data',
        searchHours: searchHours,
        timestamp: new Date().toISOString(),
        note: 'Prices are indicative and may vary'
      }
    });

  } catch (err) {
    console.error('Flight route search error:', err.message);
    res.status(500).json({ 
      message: 'Error searching flight route', 
      error: err.message 
    });
  }
};

// Helper function to calculate flight duration
exports.calculateDuration = (departure, arrival) => {
  if (!departure || !arrival) return 'Unknown';
  
  const depTime = new Date(departure);
  const arrTime = new Date(arrival);
  const diffMs = arrTime - depTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHours}h ${diffMins}m`;
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