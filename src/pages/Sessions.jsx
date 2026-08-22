import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Sessions.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

export default function Sessions() {
  const { token, isAuthenticated } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingSession, setPayingSession] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processingPay, setProcessingPay] = useState(false);
  const [paySuccess, setPaySuccess] = useState(null);

  // Fetch active session and history
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [activeRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/v1/sessions/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const activeJson = await activeRes.json();
      const historyJson = await historyRes.json();

      if (activeRes.ok) setActiveSession(activeJson.data);
      if (historyRes.ok) setHistory(historyJson.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

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

  if (!isAuthenticated) {
    return (
      <main className="sessions-page container">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <FlashRegular style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: 16 }} />
          <h2>Sign in to view your Charging Sessions</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Track live energy consumption, monitor charging costs, and pay invoices.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="sessions-page container">
      <GlowBlob color="green" size={200} top="-60px" left="-60px" />

      <header className="sessions-header">
        <div>
          <span className="discover__eyebrow">
            <VehicleCarRegular /> Charging Dashboard
          </span>
          <h1>My Charging <span className="tiranga-gradient-text">Sessions</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Live charging telemetry, running cost calculation, and instant payment checkout.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadData} disabled={loading}>
          <ArrowSyncRegular /> {loading ? 'Updating...' : 'Refresh'}
        </button>
      </header>

      {/* ── Active Session Banner ── */}
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
                <StopRegular /> Stop Charge & Pay
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

      {/* ── Past Sessions ── */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>Past Charging History</h2>
      {history.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.map((s) => (
            <div key={s.id} className="glass" style={{ padding: '16px 20px', borderRadius: 16, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 16, alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{s.connector?.evse?.location?.name || 'Charging Station'}</strong>
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
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No past sessions found.</p>
      )}

      {/* ── Payment Checkout Modal ── */}
      <AnimatePresence>
        {payingSession && (
          <div className="payment-modal-backdrop">
            <motion.div className="payment-modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
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
