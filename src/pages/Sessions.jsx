import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  PlugConnectedRegular,
  StopRegular,
  MoneyRegular,
  TimerRegular,
  CheckmarkCircleRegular,
  PaymentRegular,
  ArrowSyncRegular,
  VehicleCarRegular,
  CalendarRegular,
  QrCodeRegular,
  NavigationRegular,
  DismissRegular,
  ClockRegular,
  WarningRegular,
  ReceiptRegular,
  PeopleRegular,
  AlertUrgentRegular,
  ShieldCheckmarkRegular
} from '@fluentui/react-icons';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Sessions.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

function drawPassQR(canvas, text, size = 180) {
  if (!canvas || !text) return;
  QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#090A0F', light: '#FFFFFF' }
  }).catch((err) => console.error('Failed to draw QR:', err));
}

export default function Sessions() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Top Tabs: 'bookings' | 'sessions'
  const [activeTab, setActiveTab] = useState('bookings');

  // Sessions State
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingSession, setPayingSession] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processingPay, setProcessingPay] = useState(false);
  const [paySuccess, setPaySuccess] = useState(null);

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('upcoming'); // upcoming | all | past
  const [activePassBooking, setActivePassBooking] = useState(null);
  const [actionBusyId, setActionBusyId] = useState('');
  const passCanvasRef = useRef(null);

  // Fetch active session, history, and bookings
  const loadData = useCallback(async (showLoading = false) => {
    if (!token) return;
    try {
      if (showLoading) setLoading(true);
      const emailParam = user?.email ? `?driverEmail=${encodeURIComponent(user.email)}` : '';
      const [activeRes, historyRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/v1/sessions/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/v1/bookings/me${emailParam}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const activeJson = await activeRes.json().catch(() => ({}));
      const historyJson = await historyRes.json().catch(() => ({}));
      const bookingsJson = await bookingsRes.json().catch(() => ({}));

      if (activeRes.ok) setActiveSession(activeJson.data);
      if (historyRes.ok) setHistory(historyJson.data || []);
      if (bookingsRes.ok) setBookings(bookingsJson.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token, user?.email]);

  useEffect(() => {
    loadData(true);
    const timer = setInterval(() => loadData(false), 6000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Draw Pass QR Code when opened
  useEffect(() => {
    if (activePassBooking && passCanvasRef.current) {
      const qrPayload = activePassBooking.qrToken || activePassBooking.externalRef;
      drawPassQR(passCanvasRef.current, qrPayload, 180);
    }
  }, [activePassBooking]);

  // Stop Session from App
  const handleStopSession = async (sessionId) => {
    if (!confirm('Are you sure you want to stop charging?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop session');
      await loadData();
      setPayingSession(data.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pay for Session
  const handlePay = async () => {
    if (!payingSession) return;
    try {
      setProcessingPay(true);
      const res = await fetch(`${API_URL}/api/v1/sessions/${payingSession.id}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setPaySuccess(data.data);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingPay(false);
    }
  };

  // Driver Check-In upon Arrival
  const handleCheckIn = async (bookingId) => {
    setActionBusyId(`checkin-${bookingId}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Check-in failed');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusyId('');
    }
  };

  // Start Charging Directly from Booking
  const handleStartFromBooking = async (booking) => {
    setActionBusyId(`start-${booking.id}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/bookings/${booking.id}/start-charging`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialSoc: booking.batteryInitialSoc || 25,
          batteryTempC: 32.5
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Could not start charging session');
      await loadData();
      setActiveTab('sessions');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusyId('');
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this slot reservation? The bay will be released for other drivers.')) return;
    setActionBusyId(`cancel-${bookingId}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Cancellation failed');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusyId('');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="sessions-page container">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <FlashRegular style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: 16 }} />
          <h2>Sign in to view your Charging Sessions &amp; Bookings</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>
            Track booked slots, live charging telemetry, and payment receipts.
          </p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </main>
    );
  }

  // Filter Bookings
  const upcomingBookings = bookings.filter((b) => ['CONFIRMED', 'ARRIVED', 'QUEUED'].includes(b.status));
  const pastBookings = bookings.filter((b) => ['CHARGING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status));
  const displayedBookings = bookingFilter === 'upcoming'
    ? upcomingBookings
    : bookingFilter === 'past'
      ? pastBookings
      : bookings;

  return (
    <main className="sessions-page container">
      <GlowBlob color="green" size={220} top="-60px" left="-60px" />
      <GlowBlob color="blue" size={260} bottom="-100px" right="-40px" delay={2} />

      <header className="sessions-header">
        <div>
          <span className="discover__eyebrow">
            <VehicleCarRegular /> Driver Mobility Hub
          </span>
          <h1>My Bookings &amp; <span className="tiranga-gradient-text">Charging Sessions</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Manage upcoming slot reservations, access arrival QR tickets, and monitor live charging telemetry.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={() => loadData(true)} disabled={loading}>
          <ArrowSyncRegular /> {loading ? 'Updating...' : 'Refresh'}
        </button>
      </header>

      {/* ── Main View Toggle Bar ── */}
      <div className="sessions-tab-bar">
        <button
          className={`sessions-tab-btn ${activeTab === 'bookings' ? 'sessions-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <CalendarRegular /> My Slot Bookings
          {upcomingBookings.length > 0 && (
            <span className="sessions-tab-badge">{upcomingBookings.length}</span>
          )}
        </button>
        <button
          className={`sessions-tab-btn ${activeTab === 'sessions' ? 'sessions-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <FlashRegular /> Live &amp; Past Sessions
          {activeSession && <span className="sessions-tab-badge sessions-tab-badge--live">LIVE</span>}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: MY BOOKINGS & RESERVATIONS
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'bookings' && (
        <div className="sessions-bookings-section">
          {/* Sub Filter */}
          <div className="sessions-filter-row">
            <div className="booking-duration-chips">
              <button
                className={`booking-pill-btn ${bookingFilter === 'upcoming' ? 'booking-pill-btn--active' : ''}`}
                onClick={() => setBookingFilter('upcoming')}
              >
                Upcoming &amp; Active ({upcomingBookings.length})
              </button>
              <button
                className={`booking-pill-btn ${bookingFilter === 'all' ? 'booking-pill-btn--active' : ''}`}
                onClick={() => setBookingFilter('all')}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                className={`booking-pill-btn ${bookingFilter === 'past' ? 'booking-pill-btn--active' : ''}`}
                onClick={() => setBookingFilter('past')}
              >
                Completed &amp; Cancelled ({pastBookings.length})
              </button>
            </div>

            <Link to="/discover" className="btn-primary btn-sm">
              <CalendarRegular /> Book a New Slot
            </Link>
          </div>

          {/* Bookings List */}
          {displayedBookings.length > 0 ? (
            <div className="sessions-bookings-grid">
              {displayedBookings.map((b) => {
                const isConfirmed = b.status === 'CONFIRMED';
                const isArrived = b.status === 'ARRIVED';
                const isQueued = b.status === 'QUEUED';
                const isCharging = b.status === 'CHARGING';
                const isCancelled = b.status === 'CANCELLED';

                const nowMs = Date.now();
                const startMs = Date.parse(b.slotStart);
                const endMs = Date.parse(b.slotEnd);
                const minDiff = Math.round((startMs - nowMs) / 60_000);
                const isWithinWindow = nowMs >= (startMs - 15 * 60_000) && nowMs <= endMs;

                return (
                  <article key={b.id} className="sessions-booking-card glass">
                    <div className="sessions-booking-card-head">
                      <div>
                        <div className="sessions-booking-ref">
                          <span>Ref:</span> <strong>{b.externalRef}</strong>
                          {b.bookingType === 'EMERGENCY' && (
                            <span className="sessions-emergency-tag">
                              <AlertUrgentRegular /> EMERGENCY
                            </span>
                          )}
                        </div>
                        <h3 className="sessions-booking-title">{b.stationName}</h3>
                        <p className="sessions-booking-addr">{b.stationAddress || b.stationCity}</p>
                      </div>

                      <div className={`sessions-status-pill sessions-status-pill--${b.status?.toLowerCase()}`}>
                        {isConfirmed ? 'CONFIRMED' : isArrived ? 'ARRIVED' : isQueued ? `QUEUED #${b.position || 1}` : b.status}
                      </div>
                    </div>

                    <div className="sessions-booking-specs">
                      <div className="sessions-spec-item">
                        <span>Connector</span>
                        <strong>{b.connectorStandard} ({b.connectorPowerKw} kW)</strong>
                      </div>
                      <div className="sessions-spec-item">
                        <span>Date &amp; Time</span>
                        <strong style={{ color: '#38bdf8' }}>
                          {new Date(b.slotStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {new Date(b.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                      <div className="sessions-spec-item">
                        <span>Vehicle</span>
                        <strong>{b.vehicleName}</strong>
                      </div>
                      <div className="sessions-spec-item">
                        <span>Estimated Cost</span>
                        <strong style={{ color: '#10b981' }}>₹{Number(b.totalCost || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Countdown / Window Indicator */}
                    {(isConfirmed || isArrived) && (
                      <div className="sessions-countdown-bar">
                        <ClockRegular />
                        <span>
                          {isWithinWindow
                            ? '⚡ Window is ACTIVE NOW — Proceed to bay & check-in'
                            : minDiff > 0
                              ? `Slot starts in ${Math.floor(minDiff / 60)}h ${minDiff % 60}m`
                              : 'Slot window is in progress'}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="sessions-booking-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => setActivePassBooking(b)}
                        title="Show dynamic QR pass to scan at terminal"
                      >
                        <QrCodeRegular /> Digital Pass
                      </button>

                      {isConfirmed && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleCheckIn(b.id)}
                          disabled={actionBusyId === `checkin-${b.id}`}
                        >
                          <CheckmarkCircleRegular /> {actionBusyId === `checkin-${b.id}` ? 'Checking in…' : 'I Have Arrived'}
                        </button>
                      )}

                      {(isConfirmed || isArrived) && isWithinWindow && (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleStartFromBooking(b)}
                          disabled={actionBusyId === `start-${b.id}`}
                        >
                          <FlashRegular /> {actionBusyId === `start-${b.id}` ? 'Starting…' : 'Start Charging'}
                        </button>
                      )}

                      {b.stationLatitude && b.stationLongitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${b.stationLatitude},${b.stationLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary btn-sm btn-icon"
                          title="Open directions in Google Maps"
                        >
                          <NavigationRegular />
                        </a>
                      )}

                      {(isConfirmed || isQueued) && (
                        <button
                          className="btn-secondary btn-sm sessions-cancel-btn"
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={actionBusyId === `cancel-${b.id}`}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="glass" style={{ padding: 40, borderRadius: 20, textAlign: 'center' }}>
              <CalendarRegular style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>No Bookings Found</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-tertiary)', margin: '6px 0 20px' }}>
                You have no {bookingFilter === 'upcoming' ? 'upcoming' : ''} reservations at the moment.
              </p>
              <Link to="/discover" className="btn-primary">Find a Station &amp; Book Slot</Link>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: LIVE & PAST SESSIONS
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div className="sessions-telemetry-section">
          {/* Active Session Banner */}
          {activeSession ? (
            <div className="active-session-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 2s infinite' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Active Charging Session
                  </h2>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>
                  {activeSession.stationName}
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '6px 0 16px' }}>
                {activeSession.address} · {activeSession.connectorStandard} ({activeSession.maxPowerKw} kW)
              </p>

              <div className="active-session-grid">
                <div className="active-session-metric">
                  <span className="active-session-metric-label">Energy Delivered</span>
                  <div className="active-session-metric-value" style={{ color: '#38bdf8' }}>
                    {activeSession.energyKwh} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>kWh</span>
                  </div>
                </div>

                <div className="active-session-metric">
                  <span className="active-session-metric-label">Duration</span>
                  <div className="active-session-metric-value">
                    {activeSession.durationMinutes} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>min</span>
                  </div>
                </div>

                <div className="active-session-metric">
                  <span className="active-session-metric-label">Live Cost</span>
                  <div className="active-session-metric-value" style={{ color: '#10b981' }}>
                    ₹{activeSession.liveCost.toFixed(2)}
                  </div>
                </div>

                <div className="active-session-metric" style={{ justifyContent: 'center' }}>
                  <button
                    className="btn-danger"
                    style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => handleStopSession(activeSession.id)}
                  >
                    <StopRegular /> Stop Charge &amp; Pay
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass" style={{ padding: 24, borderRadius: 20, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>No Active Charging Session</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
                  Book a slot or scan the kiosk QR code at any charging station to start charging.
                </p>
              </div>
              <Link to="/kiosk" className="btn-primary btn-sm">Open Station Kiosk Simulator</Link>
            </div>
          )}

          {/* Past Sessions History */}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>Past Charging History</h2>
          {history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((s) => (
                <div key={s.id} className="glass" style={{ padding: '16px 20px', borderRadius: 16, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{s.connector?.evse?.location?.name || s.stationName || 'Charging Station'}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{new Date(s.startTime).toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Energy</span>
                    <div style={{ fontWeight: 700 }}>{(Number(s.energyWh || 0) / 1000).toFixed(2)} kWh</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount</span>
                    <div style={{ fontWeight: 800, color: '#10b981' }}>₹{Number(s.cost || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    {s.status === 'COMPLETED' ? (
                      <button className="btn-primary btn-sm" onClick={() => { setPayingSession(s); setPaySuccess(null); }}>
                        <PaymentRegular /> Pay Now
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 999, fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                        {s.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No past sessions recorded.</p>
          )}
        </div>
      )}

      {/* ── DIGITAL PASS MODAL ── */}
      <AnimatePresence>
        {activePassBooking && (
          <div className="payment-modal-backdrop" onClick={() => setActivePassBooking(null)}>
            <motion.div
              className="payment-modal glass"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Digital Check-In Ticket Pass</h3>
                  <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontFamily: 'var(--font-mono, monospace)' }}>
                    {activePassBooking.externalRef}
                  </span>
                </div>
                <button className="btn-icon" onClick={() => setActivePassBooking(null)}>
                  <DismissRegular />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                <canvas ref={passCanvasRef} style={{ background: '#ffffff', padding: 8, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  Hold this QR code against the station kiosk or present to operator
                </p>
              </div>

              <div className="payment-receipt" style={{ width: '100%', marginTop: 8 }}>
                <div className="payment-receipt-row">
                  <span>Station</span>
                  <strong>{activePassBooking.stationName}</strong>
                </div>
                <div className="payment-receipt-row">
                  <span>Bay Standard</span>
                  <span>{activePassBooking.connectorStandard} ({activePassBooking.connectorPowerKw} kW)</span>
                </div>
                <div className="payment-receipt-row">
                  <span>Reserved Slot</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {new Date(activePassBooking.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(activePassBooking.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="payment-receipt-row">
                  <span>Estimated Total</span>
                  <strong style={{ color: '#10b981' }}>₹{Number(activePassBooking.totalCost || 0).toFixed(2)} INR</strong>
                </div>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                onClick={() => setActivePassBooking(null)}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PAYMENT CHECKOUT MODAL ── */}
      <AnimatePresence>
        {payingSession && (
          <div className="payment-modal-backdrop" onClick={() => setPayingSession(null)}>
            <motion.div className="payment-modal glass" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              {paySuccess ? (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <CheckmarkCircleRegular style={{ fontSize: '3.5rem', color: '#10b981' }} />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Payment Successful!</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tx ID: {paySuccess.transactionId}</p>

                  <div className="payment-receipt" style={{ width: '100%' }}>
                    <div className="payment-receipt-row">
                      <span>Amount Paid</span>
                      <strong style={{ color: '#10b981' }}>₹{paySuccess.amountPaid} INR</strong>
                    </div>
                    <div className="payment-receipt-row">
                      <span>Payment Method</span>
                      <span>{paySuccess.paymentMethod}</span>
                    </div>
                    <div className="payment-receipt-row">
                      <span>Timestamp</span>
                      <span>{new Date(paySuccess.paidAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={() => setPayingSession(null)} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Charging Bill Payment</h2>
                    <button className="btn-secondary btn-sm" onClick={() => setPayingSession(null)}>✕</button>
                  </div>

                  <div className="payment-receipt">
                    <div className="payment-receipt-row">
                      <span>Session ID</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem' }}>{payingSession.id?.slice(0, 8)}...</span>
                    </div>
                    <div className="payment-receipt-row">
                      <span>Total Energy</span>
                      <span>{(Number(payingSession.energyWh || 0) / 1000).toFixed(2)} kWh</span>
                    </div>
                    <div className="payment-receipt-row" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                      <span>Total Due</span>
                      <span>₹{Number(payingSession.cost || 0).toFixed(2)} INR</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
                      Select Payment Method
                    </label>
                    <div className="payment-method-selector">
                      {['UPI', 'CARD', 'WALLET'].map((m) => (
                        <button
                          key={m}
                          className={`payment-method-btn ${paymentMethod === m ? 'payment-method-btn--active' : ''}`}
                          onClick={() => setPaymentMethod(m)}
                        >
                          <PaymentRegular style={{ fontSize: '1.2rem' }} />
                          {m === 'UPI' ? 'UPI / GPay' : m === 'CARD' ? 'Card' : 'Wallet'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="btn-primary" onClick={handlePay} disabled={processingPay} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                    {processingPay ? 'Processing Payment...' : `Pay ₹${Number(payingSession.cost || 0).toFixed(2)}`}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
