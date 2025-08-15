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
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    throw new Error('Amadeus API credentials are not configured');
  }

  const url = `${AMADEUS_BASE_URL}/security/oauth2/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', AMADEUS_API_KEY);
  params.append('client_secret', AMADEUS_API_SECRET);

  try {
    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('Amadeus token obtained successfully');
    return response.data.access_token;
  } catch (err) {
    console.error('Amadeus token error:', err.response?.data || err.message);
    throw new Error('Failed to get Amadeus access token');
  }
}

// Dynamic airport search using Amadeus API
exports.searchAirports = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    // If no API credentials, fall back to static list
    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      const filtered = airports.filter(airport =>
        airport.name.toLowerCase().includes(q.toLowerCase()) ||
        airport.code.toLowerCase().includes(q.toLowerCase()) ||
        airport.city.toLowerCase().includes(q.toLowerCase()) ||
        airport.country.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10);
      return res.json(filtered);
    }

    const token = await getAccessToken();
    
    const response = await axios.get(`${AMADEUS_BASE_URL}/reference-data/locations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        keyword: q,
        subType: 'AIRPORT,CITY',
        'page[limit]': 10
      }
    });

    const airports = response.data.data.map(location => ({
      code: location.iataCode,
      name: location.name,
      city: location.address?.cityName || '',
      country: location.address?.countryName || '',
      detailedName: location.detailedName
    }));

    res.json(airports);
  } catch (err) {
    console.error('Error searching airports:', err.response?.data || err.message);
    
    // Fall back to static search if API fails
    const { q } = req.query;
    const filtered = airports.filter(airport =>
      airport.name.toLowerCase().includes(q.toLowerCase()) ||
      airport.code.toLowerCase().includes(q.toLowerCase()) ||
      airport.city.toLowerCase().includes(q.toLowerCase()) ||
      airport.country.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
    
    res.json(filtered);
  }
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

    // Validate required parameters
    if (!originLocationCode || !destinationLocationCode || !departureDate || !adults) {
      return res.status(400).json({ 
        message: 'Missing required parameters', 
        required: ['originLocationCode', 'destinationLocationCode', 'departureDate', 'adults'] 
      });
    }

    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      return res.status(500).json({ 
        message: 'Amadeus API credentials are not configured' 
      });
    }

    const token = await getAccessToken();
    console.log('Using token for flight search');

    const params = {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults: parseInt(adults),
      travelClass: travelClass || 'ECONOMY',
      currencyCode: 'USD',
      max: max || 10
    };

    if (returnDate) params.returnDate = returnDate;
    if (children) params.children = parseInt(children);

    console.log('Flight search params:', params);

    try {
      const response = await axios.get(`${AMADEUS_BASE_URL}/shopping/flight-offers`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });

      console.log('Flight search successful, found', response.data.data?.length || 0, 'flights');
      
      const flightOffers = response.data.data || [];
      
      // Format the response for easier frontend consumption
      const formattedFlights = flightOffers.map(offer => ({
        id: offer.id,
        price: {
          currency: offer.price.currency,
          total: offer.price.total,
          base: offer.price.base
        },
        itineraries: offer.itineraries.map(itinerary => ({
          duration: itinerary.duration,
          segments: itinerary.segments.map(segment => ({
            departure: {
              iataCode: segment.departure.iataCode,
              terminal: segment.departure.terminal,
              at: segment.departure.at
            },
            arrival: {
              iataCode: segment.arrival.iataCode,
              terminal: segment.arrival.terminal,
              at: segment.arrival.at
            },
            carrierCode: segment.carrierCode,
            number: segment.number,
            aircraft: segment.aircraft,
            duration: segment.duration
          }))
        })),
        validatingAirlineCodes: offer.validatingAirlineCodes,
        travelerPricings: offer.travelerPricings
      }));

      res.json({
        success: true,
        data: formattedFlights,
        meta: {
          count: formattedFlights.length,
          source: 'amadeus_api'
        }
      });

    } catch (apiError) {
      // If Amadeus API fails due to product limitations, return mock data
      if (apiError.response?.status === 401 && 
          apiError.response?.data?.fault?.detail?.errorcode?.includes('InvalidAPICallAsNoApiProductMatchFound')) {
        
        console.log('Amadeus API product limitation detected, returning mock data');
        
        // Generate mock flight data
        const mockFlights = generateMockFlights(originLocationCode, destinationLocationCode, departureDate, returnDate, adults);
        
        return res.json({
          success: true,
          data: mockFlights,
          meta: {
            count: mockFlights.length,
            source: 'mock_data',
            message: 'Real-time data unavailable. Showing sample flights.'
          }
        });
      }
      
      // Re-throw other API errors
      throw apiError;
    }

  } catch (err) {
    console.error('Error searching flights:', err.response?.data || err.message);
    
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Amadeus API authentication failed', 
        error: 'Invalid credentials or expired token' 
      });
    }
    
    if (err.response?.status === 400) {
      return res.status(400).json({ 
        message: 'Invalid flight search parameters', 
        error: err.response.data 
      });
    }

    res.status(500).json({ 
      message: 'Error searching flights', 
      error: err.response?.data || err.message 
    });
  }
};

// Generate mock flight data for demo purposes
function generateMockFlights(origin, destination, departureDate, returnDate, adults) {
  const airlines = [
    { code: 'UA', name: 'United Airlines' },
    { code: 'AA', name: 'American Airlines' },
    { code: 'DL', name: 'Delta Air Lines' },
    { code: 'B6', name: 'JetBlue Airways' },
    { code: 'AS', name: 'Alaska Airlines' }
  ];

  const mockFlights = [];
  
  for (let i = 0; i < 5; i++) {
    const airline = airlines[i % airlines.length];
    const basePrice = 200 + (i * 50) + Math.floor(Math.random() * 100);
    const departureTime = new Date(departureDate);
    departureTime.setHours(6 + (i * 3), Math.floor(Math.random() * 60));
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + 4 + Math.floor(Math.random() * 3));

    const flight = {
      id: `mock_${i + 1}`,
      price: {
        currency: 'USD',
        total: basePrice.toString(),
        base: (basePrice - 50).toString()
      },
      itineraries: [
        {
          duration: `PT${4 + i}H${30 + (i * 10)}M`,
          segments: [
            {
              departure: {
                iataCode: origin,
                terminal: Math.random() > 0.5 ? '1' : '2',
                at: departureTime.toISOString()
              },
              arrival: {
                iataCode: destination,
                terminal: Math.random() > 0.5 ? '4' : '5',
                at: arrivalTime.toISOString()
              },
              carrierCode: airline.code,
              number: `${airline.code}${1000 + i}`,
              aircraft: { code: '320' },
              duration: `PT${4 + i}H${30 + (i * 10)}M`
            }
          ]
        }
      ],
      validatingAirlineCodes: [airline.code],
      travelerPricings: [
        {
          travelerId: '1',
          fareOption: 'STANDARD',
          travelerType: 'ADULT',
          price: {
            currency: 'USD',
            total: basePrice.toString(),
            base: (basePrice - 50).toString()
          }
        }
      ]
    };

    // Add return flight if returnDate is provided
    if (returnDate) {
      const returnDepartureTime = new Date(returnDate);
      returnDepartureTime.setHours(8 + (i * 2), Math.floor(Math.random() * 60));
      
      const returnArrivalTime = new Date(returnDepartureTime);
      returnArrivalTime.setHours(returnArrivalTime.getHours() + 4 + Math.floor(Math.random() * 3));

      flight.itineraries.push({
        duration: `PT${4 + i}H${30 + (i * 10)}M`,
        segments: [
          {
            departure: {
              iataCode: destination,
              terminal: Math.random() > 0.5 ? '4' : '5',
              at: returnDepartureTime.toISOString()
            },
            arrival: {
              iataCode: origin,
              terminal: Math.random() > 0.5 ? '1' : '2',
              at: returnArrivalTime.toISOString()
            },
            carrierCode: airline.code,
            number: `${airline.code}${2000 + i}`,
            aircraft: { code: '320' },
            duration: `PT${4 + i}H${30 + (i * 10)}M`
          }
        ]
      });
    }

    mockFlights.push(flight);
  }

  return mockFlights;
}