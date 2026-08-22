/**
 * Structured API endpoint data for the UEI framework documentation.
 * Derived from the actual BHEV-server route files.
 */

const apiEndpoints = {
  auth: {
    title: 'Authentication',
    description: 'User registration, login, and verification endpoints. Supports email/password, OTP (phone), and Google OAuth.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'POST',
        path: '/auth/email/signup',
        summary: 'Register a new user via email',
        auth: false,
        request: {
          body: {
            email: 'user@example.com',
            password: 'securePassword123',
            name: 'John Doe',
            role: 'customer',
          },
        },
        response: {
          email: 'user@example.com',
          needsVerification: true,
          message: 'verification code sent',
        },
        notes: 'A 6-digit verification code is sent to the provided email. To create operator/admin roles, include `adminSecret` in the request body.',
      },
      {
        method: 'POST',
        path: '/auth/email/verify',
        summary: 'Verify email with OTP code',
        auth: false,
        request: {
          body: {
            email: 'user@example.com',
            code: '123456',
          },
        },
        response: {
          user: { id: 'uuid', name: 'John Doe', email: 'user@example.com', role: 'customer' },
          token: 'jwt_token_here',
        },
      },
      {
        method: 'POST',
        path: '/auth/email/login',
        summary: 'Login with email and password',
        auth: false,
        request: {
          body: {
            email: 'user@example.com',
            password: 'securePassword123',
          },
        },
        response: {
          user: { id: 'uuid', name: 'John Doe', email: 'user@example.com', role: 'customer' },
          token: 'jwt_token_here',
        },
        notes: 'Returns JWT token valid for 7 days. Email must be verified first.',
      },
      {
        method: 'POST',
        path: '/auth/otp',
        summary: 'Request phone OTP',
        auth: false,
        request: {
          body: { phone: '+919876543210' },
        },
        response: {
          phone: '+919876543210',
          otp: '123456',
        },
        notes: 'In production, the OTP will be sent via SMS instead of being returned in the response.',
      },
      {
        method: 'POST',
        path: '/auth/otp/verify',
        summary: 'Verify phone OTP and login',
        auth: false,
        request: {
          body: {
            phone: '+919876543210',
            code: '123456',
            name: 'John Doe',
          },
        },
        response: {
          user: { id: 'uuid', phone: '+919876543210', role: 'customer' },
          token: 'jwt_token_here',
        },
      },
      {
        method: 'GET',
        path: '/auth/google',
        summary: 'Initiate Google OAuth redirect',
        auth: false,
        request: {},
        response: { msg: 'Google OAuth placeholder' },
        notes: 'Google OAuth flow — redirects to Google consent screen.',
      },
      {
        method: 'GET',
        path: '/auth/google/callback',
        summary: 'Google OAuth callback',
        auth: false,
        request: {},
        response: { msg: 'Google OAuth callback placeholder' },
        notes: 'Handles the redirect back from Google after consent.',
      },
    ],
  },

  stations: {
    title: 'Stations',
    description: 'Manage charging stations — list, search nearby, create (operators), and update station details.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'GET',
        path: '/stations',
        summary: 'List all stations',
        auth: false,
        request: {},
        response: [
          {
            id: 'uuid',
            name: 'Green Charge Hub',
            operator: 'EcoCharge',
            operatorId: 'uuid',
            lat: 12.9716,
            lng: 77.5946,
            connectors: [{ type: 'CCS2', power: 50 }],
            tariff: { rate: 12, unit: 'kWh' },
            rating: 4.5,
            waitTimeMin: 10,
            status: 'active',
          },
        ],
      },
      {
        method: 'GET',
        path: '/stations/nearby',
        summary: 'Find nearby stations',
        auth: false,
        request: {
          query: 'lat=12.97&lng=77.59&radius=10',
        },
        response: [
          {
            id: 'uuid',
            name: 'Green Charge Hub',
            lat: 12.9716,
            lng: 77.5946,
            status: 'active',
          },
        ],
        notes: 'Currently returns all stations. Geo-filtering will be implemented in a future update.',
      },
      {
        method: 'GET',
        path: '/stations/:id',
        summary: 'Get station details with available slots',
        auth: false,
        request: {},
        response: {
          station: {
            id: 'uuid',
            name: 'Green Charge Hub',
            operator: 'EcoCharge',
            connectors: [{ type: 'CCS2', power: 50 }],
            tariff: { rate: 12, unit: 'kWh' },
            rating: 4.5,
          },
          availableSlots: [
            { slotStart: '2026-08-22T14:00:00Z', slotEnd: '2026-08-22T15:00:00Z' },
            { slotStart: '2026-08-22T15:00:00Z', slotEnd: '2026-08-22T16:00:00Z' },
          ],
        },
        notes: 'Returns the next 8 hourly slots, excluding those with confirmed bookings.',
      },
      {
        method: 'POST',
        path: '/stations',
        summary: 'Create a new station',
        auth: 'operator / admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: {
            name: 'New Charge Point',
            lat: 12.9716,
            lng: 77.5946,
            connectors: [{ type: 'CCS2', power: 50 }],
            tariff: { rate: 12, unit: 'kWh' },
          },
        },
        response: {
          id: 'uuid',
          name: 'New Charge Point',
          operatorId: 'operator-uuid',
          status: 'unknown',
        },
      },
      {
        method: 'PUT',
        path: '/stations/:id',
        summary: 'Update station details',
        auth: 'any (public)',
        request: {
          body: {
            name: 'Updated Name',
            status: 'active',
            tariff: { rate: 15, unit: 'kWh' },
          },
        },
        response: { id: 'uuid', name: 'Updated Name', status: 'active' },
        notes: 'Partial updates supported — only include fields to change.',
      },
      {
        method: 'DELETE',
        path: '/stations/:id',
        summary: 'Delete a station',
        auth: 'any (public)',
        request: {},
        response: { ok: true },
      },
    ],
  },

  bookings: {
    title: 'Bookings',
    description: 'Create, confirm, and cancel charging slot bookings. Supports conflict detection to prevent double-booking.',
    audience: ['developers'],
    endpoints: [
      {
        method: 'POST',
        path: '/bookings',
        summary: 'Create a new booking',
        auth: 'customer',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: {
            stationId: 'station-uuid',
            slotStart: '2026-08-22T14:00:00Z',
            slotEnd: '2026-08-22T15:00:00Z',
          },
        },
        response: {
          id: 'booking-uuid',
          userId: 'user-uuid',
          stationId: 'station-uuid',
          slotStart: '2026-08-22T14:00:00Z',
          slotEnd: '2026-08-22T15:00:00Z',
          qrToken: 'unique-qr-token',
          status: 'confirmed',
        },
        notes: 'Returns a QR token used to start a charging session. Slot conflicts return 400.',
      },
      {
        method: 'POST',
        path: '/bookings/:id/confirm',
        summary: 'Confirm a pending booking',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: { id: 'uuid', status: 'confirmed' },
      },
      {
        method: 'POST',
        path: '/bookings/:id/cancel',
        summary: 'Cancel a booking',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: { id: 'uuid', status: 'cancelled' },
      },
      {
        method: 'GET',
        path: '/bookings/:id',
        summary: 'Get booking details',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: {
          id: 'uuid',
          stationId: 'station-uuid',
          slotStart: '2026-08-22T14:00:00Z',
          slotEnd: '2026-08-22T15:00:00Z',
          qrToken: 'visible-only-to-owner-or-operator',
          status: 'confirmed',
        },
        notes: 'QR token is only visible to the booking owner, station operator, or admin.',
      },
      {
        method: 'GET',
        path: '/bookings/station/:stationId',
        summary: 'Get all bookings for a station',
        auth: 'operator / admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: [
          { id: 'uuid', userId: 'user-uuid', slotStart: '...', status: 'confirmed' },
        ],
      },
    ],
  },

  sessions: {
    title: 'Sessions',
    description: 'Manage charging sessions — start via QR scan, submit energy readings, and stop with cost calculation.',
    audience: ['developers', 'cpos'],
    endpoints: [
      {
        method: 'POST',
        path: '/sessions',
        summary: 'Start a charging session',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: {
            bookingId: 'booking-uuid',
            qrToken: 'qr-token-from-booking',
          },
        },
        response: {
          id: 'session-uuid',
          bookingId: 'booking-uuid',
          startTime: '2026-08-22T14:00:00Z',
          energyConsumed: 0,
          cost: 0,
        },
        notes: 'QR token must match the booking. Sets booking status to `in_progress`.',
      },
      {
        method: 'POST',
        path: '/sessions/:id/stop',
        summary: 'Stop a charging session',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: {
          id: 'session-uuid',
          startTime: '2026-08-22T14:00:00Z',
          endTime: '2026-08-22T15:30:00Z',
          energyConsumed: 12.5,
          cost: 2.5,
        },
        notes: 'Calculates final cost based on energy consumed. Sets booking status to `completed`.',
      },
      {
        method: 'GET',
        path: '/sessions/:id',
        summary: 'Get session details',
        auth: 'authenticated',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: {
          id: 'session-uuid',
          bookingId: 'booking-uuid',
          startTime: '2026-08-22T14:00:00Z',
          energyConsumed: 8.3,
          cost: 1.66,
        },
      },
      {
        method: 'POST',
        path: '/sessions/:id/reading',
        summary: 'Submit energy reading (CPO)',
        auth: 'operator / admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: { energy: 0.5 },
        },
        response: {
          id: 'session-uuid',
          energyConsumed: 8.8,
          cost: 105.6,
        },
        notes: 'Energy is added incrementally (in kWh). Cost is recalculated using the station tariff rate.',
      },
    ],
  },

  payments: {
    title: 'Payments',
    description: 'Payment processing endpoints. Currently supports mock UPI payments for development.',
    audience: ['developers'],
    endpoints: [
      {
        method: 'POST',
        path: '/payments/upi/mock',
        summary: 'Mock UPI payment',
        auth: false,
        request: {
          body: { sessionId: 'session-uuid', amount: 150 },
        },
        response: {
          id: 'payment-uuid',
          sessionId: 'session-uuid',
          amount: 150,
          method: 'upi',
          status: 'completed',
        },
        notes: 'Mock endpoint for development. Will be replaced with actual UPI integration.',
      },
    ],
  },

  operator: {
    title: 'Operator',
    description: 'Endpoints exclusive to charging station operators (CPOs). Manage stations and view bookings.',
    audience: ['cpos'],
    endpoints: [
      {
        method: 'GET',
        path: '/operator/bookings',
        summary: 'Get all bookings for operator stations',
        auth: 'operator',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: {
          stations: [{ id: 'uuid', name: 'My Station' }],
          bookings: [{ id: 'uuid', stationId: 'uuid', status: 'confirmed' }],
        },
        notes: 'Returns all stations owned by the authenticated operator and their associated bookings.',
      },
    ],
  },

  admin: {
    title: 'Admin',
    description: 'Administrative endpoints for platform management. Requires admin role authentication.',
    audience: ['cpos'],
    endpoints: [
      {
        method: 'GET',
        path: '/admin/api/users',
        summary: 'List all users',
        auth: 'admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: [
          { id: 'uuid', name: 'John Doe', email: 'user@example.com', role: 'customer' },
        ],
      },
      {
        method: 'GET',
        path: '/admin/api/stations',
        summary: 'List all stations (admin)',
        auth: 'admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: [
          { id: 'uuid', name: 'Green Hub', operator: 'EcoCharge', status: 'active' },
        ],
      },
      {
        method: 'GET',
        path: '/admin/api/bookings',
        summary: 'List all bookings (admin)',
        auth: 'admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
        },
        response: [
          { id: 'uuid', userId: 'uuid', stationId: 'uuid', status: 'confirmed' },
        ],
      },
      {
        method: 'PUT',
        path: '/admin/api/stations/:id',
        summary: 'Update any station (admin)',
        auth: 'admin',
        request: {
          headers: { Authorization: 'Bearer <token>' },
          body: { name: 'Updated Station', status: 'active' },
        },
        response: { id: 'uuid', name: 'Updated Station', status: 'active' },
      },
    ],
  },
};

export default apiEndpoints;
