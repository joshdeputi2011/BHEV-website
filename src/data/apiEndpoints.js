/** Public CHARGEGRID Unified EV Platform API Contract. */
const apiEndpoints = {
  auth: {
    title: 'Authentication & Users',
    description: 'JWT authentication, customer registration, user profiles, and onboarding role assignments.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/auth/register',
        summary: 'Create a new customer account',
        auth: false,
        request: { body: { email: 'driver@example.com', password: 'at-least-8-characters', name: 'Driver Name' } },
        response: { user: { id: 'uuid', email: 'driver@example.com', name: 'Driver Name', role: 'customer' }, token: 'jwt-bearer-token' },
      },
      {
        method: 'POST',
        path: '/api/v1/auth/login',
        summary: 'Obtain a JWT bearer token',
        auth: false,
        request: { body: { email: 'driver@example.com', password: 'at-least-8-characters' } },
        response: { user: { id: 'uuid', email: 'driver@example.com', role: 'customer' }, token: 'jwt-bearer-token' },
      },
      {
        method: 'GET',
        path: '/api/v1/users/me',
        summary: 'Get current user profile',
        auth: 'JWT',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { user: { id: 'uuid', email: 'driver@example.com', name: 'Driver Name', role: 'customer', emailVerified: true } },
      },
      {
        method: 'PATCH',
        path: '/api/v1/users/me/role',
        summary: 'Update role during onboarding',
        auth: 'JWT',
        request: { headers: { Authorization: 'Bearer <token>' }, body: { role: 'operator' } },
        response: { user: { id: 'uuid', role: 'operator' }, message: 'Role updated successfully' },
      },
    ],
  },
  discovery: {
    title: 'Station Discovery & Availability',
    description: 'Normalized, CPO-neutral station, connector, and live connector availability views.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/stations',
        summary: 'Search normalized stations across all CPOs',
        auth: false,
        request: { query: 'q=Bangalore&connector=CCS2&limit=50' },
        response: { data: [{ id: 'uuid', name: 'Koramangala Fast Hub', operator: { code: 'mock_cpo', name: 'ChargeGrid Hub' }, connectors: [] }] },
      },
      {
        method: 'GET',
        path: '/api/v1/stations/nearby',
        summary: 'Find stations near GPS coordinates with distance',
        auth: false,
        request: { query: 'lat=12.9352&lng=77.6245&radiusKm=10' },
        response: { data: [{ id: 'uuid', name: 'Indiranagar Hub', distanceKm: 1.45, connectors: [] }] },
      },
      {
        method: 'GET',
        path: '/api/v1/stations/:stationId',
        summary: 'Get detailed station metadata and active tariffs',
        auth: false,
        request: {},
        response: { data: { id: 'uuid', name: 'Electronic City DC Hub', tariffs: [{ currency: 'INR', pricePerKwh: 12.5, flatFee: 20 }] } },
      },
      {
        method: 'GET',
        path: '/api/v1/availability',
        summary: 'Read real-time connector status',
        auth: false,
        request: { query: 'stationId=uuid' },
        response: { data: [{ connectorId: 'uuid', standard: 'CCS2', maxPowerKw: 60, status: 'AVAILABLE', source: 'NORMALIZED_CPO' }] },
      },
    ],
  },
  booking: {
    title: 'Conflict-Safe Slot Bookings & QR',
    description: 'Atomic slot reservation with serializable row locks and rotating HMAC QR arrival confirmation.',
    audience: ['developers'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/bookings',
        summary: 'Reserve an atomic charging slot',
        auth: 'JWT',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: {
            connectorId: 'uuid',
            locationId: 'uuid',
            idempotencyKey: 'client-uuid-v4',
            slotStart: '2026-08-22T17:00:00.000Z',
            slotEnd: '2026-08-22T17:30:00.000Z',
          },
        },
        response: { data: { id: 'uuid', status: 'CONFIRMED', slotStart: '2026-08-22T17:00:00.000Z' }, message: 'Booking confirmed' },
        notes: 'Overlapping bookings return HTTP 409 Conflict. Repeating an idempotencyKey returns the existing booking.',
      },
      {
        method: 'GET',
        path: '/api/v1/bookings/me',
        summary: 'List caller’s active and past bookings',
        auth: 'JWT',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { data: [{ id: 'uuid', status: 'CONFIRMED', location: {}, connector: {} }] },
      },
      {
        method: 'POST',
        path: '/api/v1/arrivals/verify',
        summary: 'Scan kiosk rotating HMAC QR to start charge session',
        auth: 'JWT',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: { bookingId: 'uuid', token: 'payload.hmac_signature' },
        },
        response: { data: { booking: { status: 'CHARGING' }, session: { id: 'uuid', status: 'ACTIVE' } }, message: 'Arrival verified. Charging session started successfully!' },
      },
    ],
  },
  kiosk: {
    title: 'Kiosk Hardware & Live Telemetry',
    description: 'Endpoints for physical touchscreen kiosks & EVSE controllers to report live power, SoC%, and handle kiosk stop events.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/kiosk/:stationId/state',
        summary: 'Get kiosk screen state (active slot, dynamic QR, session, tariff)',
        auth: false,
        request: {},
        response: {
          data: {
            station: { name: 'Koramangala DC Hub' },
            connector: { standard: 'CCS2', maxPowerKw: 60, status: 'CHARGING' },
            qr: { token: 'payload.hmac', expiresAt: '2026-08-22T17:31:00.000Z' },
            activeBooking: { id: 'uuid', user: { name: 'Josh' } },
            activeSession: { id: 'uuid', energyWh: 14500, cost: 201.25, status: 'ACTIVE' },
          },
        },
      },
      {
        method: 'POST',
        path: '/api/v1/kiosk/:stationId/telemetry',
        summary: 'Stream live charger hardware pulses (kW, V, A, SoC%, Energy Wh)',
        auth: false,
        request: {
          body: {
            connectorId: 'uuid',
            energyWh: 16200,
            powerKw: 58.5,
            voltage: 398,
            current: 147,
            socPercent: 68.4,
          },
        },
        response: {
          data: { sessionId: 'uuid', energyKwh: 16.2, liveCost: 222.5, currency: 'INR' },
        },
      },
      {
        method: 'POST',
        path: '/api/v1/kiosk/:stationId/stop-session',
        summary: 'Stop session from kiosk hardware & generate invoice',
        auth: false,
        request: { body: { finalEnergyWh: 18500 } },
        response: {
          data: {
            invoice: { sessionId: 'uuid', energyDeliveredKwh: 18.5, energyCost: 231.25, flatConnectionFee: 20, totalAmount: 251.25, currency: 'INR', paymentStatus: 'PENDING_PAYMENT' },
          },
          message: 'Charging completed. Invoice generated.',
        },
      },
    ],
  },
  sessions: {
    title: 'Charging Sessions & Instant Checkout',
    description: 'Driver live charging telemetry monitoring, session termination from app, and instant UPI / Card payment settlement.',
    audience: ['developers'],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/sessions/active',
        summary: 'Get driver’s currently active charging session & live cost',
        auth: 'JWT',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: {
          data: { id: 'uuid', stationName: 'Koramangala DC Hub', energyKwh: 14.5, durationMinutes: 18, liveCost: 201.25, currency: 'INR', status: 'ACTIVE' },
        },
      },
      {
        method: 'POST',
        path: '/api/v1/sessions/:sessionId/stop',
        summary: 'Driver terminates charge from app',
        auth: 'JWT',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { data: { id: 'uuid', status: 'COMPLETED', cost: 245.5 }, message: 'Session stopped. Ready for payment.' },
      },
      {
        method: 'POST',
        path: '/api/v1/sessions/:sessionId/pay',
        summary: 'Pay session invoice via UPI, Card, or Wallet',
        auth: 'JWT',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: { paymentMethod: 'UPI', transactionRef: 'UPI-TXN-9847291' },
        },
        response: {
          data: { sessionId: 'uuid', amountPaid: 245.5, currency: 'INR', paymentMethod: 'UPI', transactionId: 'UPI-TXN-9847291', status: 'PAID' },
          message: 'Payment verified! Thank you for charging with ChargeGrid.',
        },
      },
    ],
  },
  operator: {
    title: 'CPO Console & Admin Reporting',
    description: 'CPO partner management, live mock feed sync, and admin reporting.',
    audience: ['cpos'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/operator/mock-stations/sync',
        summary: 'Re-sync mock CPO stations into the database',
        auth: 'operator / admin',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { data: { operator: 'mock_cpo', locations: 5, connectors: 15 } },
      },
      {
        method: 'GET',
        path: '/api/v1/operator/mock-stations',
        summary: 'List mock stations with active bookings',
        auth: 'operator / admin',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { data: [] },
      },
      {
        method: 'GET',
        path: '/api/v1/operator/mock-stations/:stationId/dynamic-qr',
        summary: 'Generate HMAC-signed arrival QR (rotates every 30s)',
        auth: 'operator / admin',
        request: { headers: { Authorization: 'Bearer <token>' } },
        response: { data: { token: 'base64_payload.hmac_sha256', expiresAt: 'ISO-8601' } },
      },
    ],
  },
};

export default apiEndpoints;
