const axios = require('axios');

// You should store these in environment variables for security!
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '9iNdAWz1A8GpBAvLsPnJGxpDCRmGwDYF';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || 'AgLtrTzbg2OAosNK';
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com/v1';

// Static airport list (for demo; in production, use a DB or external API)
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

// Get Amadeus access token
async function getAccessToken() {
  const url = `${AMADEUS_BASE_URL}/security/oauth2/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', AMADEUS_API_KEY);
  params.append('client_secret', AMADEUS_API_SECRET);

  const response = await axios.post(url, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data.access_token;
}

// Airport search endpoint
exports.searchAirports = (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const filtered = airports.filter(airport =>
    airport.name.toLowerCase().includes(q.toLowerCase()) ||
    airport.code.toLowerCase().includes(q.toLowerCase()) ||
    airport.city.toLowerCase().includes(q.toLowerCase()) ||
    airport.country.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);
  res.json(filtered);
};

// Flight search endpoint
exports.searchFlights = async (req, res) => {
  try {
    const {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults,
      children,
      travelClass,
      max
    } = req.body;

    const token = await getAccessToken();

    const params = {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults,
      travelClass: travelClass || 'ECONOMY',
      currencyCode: 'USD',
      max: max || 8
    };
    if (returnDate) params.returnDate = returnDate;
    if (children) params.children = children;

    const response = await axios.get(`${AMADEUS_BASE_URL}/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });

    res.json(response.data.data || []);
  } catch (err) {
    res.status(500).json({ message: 'Error searching flights', error: err.message });
  }
};