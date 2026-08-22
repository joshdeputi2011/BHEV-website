/** Public CHARGEGRID API contract. Internal admin governance endpoints stay private. */
const apiEndpoints = {
  auth: {
    title: 'Authentication', description: 'JWT authentication for CHARGEGRID customers and authorized operator users.', audience: ['developers', 'cpos'],
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/register', summary: 'Create a customer account', auth: false, request: { body: { email: 'driver@example.com', password: 'at-least-8-characters', name: 'Driver name' } }, response: { user: { id: 'uuid', role: 'customer' }, token: 'jwt' } },
      { method: 'POST', path: '/api/v1/auth/login', summary: 'Obtain a JWT', auth: false, request: { body: { email: 'driver@example.com', password: 'at-least-8-characters' } }, response: { user: { id: 'uuid', role: 'customer' }, token: 'jwt' } },
    ],
  },
  discovery: {
    title: 'Unified station discovery', description: 'Normalized, CPO-neutral station, connector and live-status views. Prototype feeds are explicitly flagged as mock.', audience: ['developers', 'cpos'],
    endpoints: [
      { method: 'GET', path: '/api/v1/stations', summary: 'Search normalized stations', auth: false, request: { query: 'q=Koramangala&connector=CCS2' }, response: { data: [{ id: 'uuid', name: 'Green Charge', operator: { code: 'mock_cpo', isMock: true }, connectors: [] }] } },
      { method: 'GET', path: '/api/v1/stations/nearby', summary: 'Find stations by coordinates', auth: false, request: { query: 'lat=12.9352&lng=77.6245&radiusKm=10' }, response: { data: [{ id: 'uuid', distanceKm: 1.2 }] } },
      { method: 'GET', path: '/api/v1/stations/:stationId', summary: 'Get station, connectors and tariffs', auth: false, request: {}, response: { data: { id: 'uuid', connectors: [], tariffs: [] } } },
      { method: 'GET', path: '/api/v1/availability', summary: 'Read normalized connector availability', auth: false, request: { query: 'stationId=uuid' }, response: { data: [{ connectorId: 'uuid', status: 'AVAILABLE', source: 'NORMALIZED_CPO' }] } },
    ],
  },
  booking: {
    title: 'Conflict-safe booking', description: 'Bookings are idempotent and serialized with a row lock to prevent overlapping reservations for a connector.', audience: ['developers'],
    endpoints: [
      { method: 'POST', path: '/api/v1/bookings', summary: 'Reserve an available connector slot', auth: 'JWT', request: { headers: { Authorization: 'Bearer <token>' }, body: { connectorId: 'uuid', locationId: 'uuid', idempotencyKey: 'client-generated-unique-key', slotStart: '2026-08-22T14:00:00.000Z', slotEnd: '2026-08-22T15:00:00.000Z' } }, response: { data: { id: 'uuid', status: 'CONFIRMED' } }, notes: 'Overlapping slots return HTTP 409. Repeating an idempotency key returns the original result.' },
      { method: 'GET', path: '/api/v1/bookings/me', summary: 'List the caller’s bookings', auth: 'JWT', request: { headers: { Authorization: 'Bearer <token>' } }, response: { data: [] } },
      { method: 'POST', path: '/api/v1/arrivals/verify', summary: 'Verify a short-lived station QR', auth: 'JWT', request: { body: { bookingId: 'uuid', token: 'signed-dynamic-qr-token' } }, response: { data: { status: 'ARRIVED' } }, notes: 'The signed QR expires quickly and is generated only by the authorized operator simulator.' },
    ],
  },
  operator: {
    title: 'CPO prototype console', description: 'Role-gated simulator endpoints. These only process the labelled mock provider and never claim a real CPO connection.', audience: ['cpos'],
    endpoints: [
      { method: 'POST', path: '/api/v1/operator/mock-stations/sync', summary: 'Normalize the mock CPO feed', auth: 'operator / admin', request: { headers: { Authorization: 'Bearer <token>' } }, response: { data: { operator: 'mock_cpo', locations: 5, source: 'MOCK' } } },
      { method: 'GET', path: '/api/v1/operator/mock-stations', summary: 'Display mock stations and active bookings', auth: 'operator / admin', request: {}, response: { data: [] } },
      { method: 'GET', path: '/api/v1/operator/mock-stations/:stationId/dynamic-qr', summary: 'Generate a short-lived signed arrival QR', auth: 'operator / admin', request: {}, response: { data: { token: 'signed token', expiresAt: 'ISO-8601' } } },
    ],
  },
};

export default apiEndpoints;
