import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowSyncRegular,
  QrCodeRegular,
  BuildingRegular,
  WarningRegular,
  CalendarRegular,
  KeyRegular,
  FlashRegular,
  PlugConnectedRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Operator.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

const TABS = [
  { key: 'stations', label: 'Stations', icon: <BuildingRegular /> },
  { key: 'schedules', label: 'Schedules', icon: <CalendarRegular /> },
  { key: 'api', label: 'API', icon: <KeyRegular /> },
];

export default function Operator() {
  const { token, user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('stations');
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const request = useCallback((path, options = {}) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }),
  [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await request('/api/v1/operator/mock-stations');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load simulator');
      setStations(payload.data);
      setSelected(payload.data[0] || null);
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const sync = async () => {
    setLoading(true);
    try {
      const response = await request('/api/v1/operator/mock-stations/sync', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sync failed');
      setMessage(`Normalized ${payload.data.locations} mock stations and ${payload.data.connectors} connectors.`);
      await load();
    } catch (cause) {
      setMessage(cause.message);
      setLoading(false);
    }
  };

  const refreshQr = useCallback(async () => {
    if (!selected) return;
    try {
      const response = await request(`/api/v1/operator/mock-stations/${selected.id}/dynamic-qr`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'QR unavailable');
      setQr(payload.data);
    } catch (cause) {
      setMessage(cause.message);
    }
  }, [request, selected]);

  useEffect(() => { if (isAuthenticated) load(); }, [load, isAuthenticated]);
  useEffect(() => {
    refreshQr();
    const timer = setInterval(refreshQr, 30_000);
    return () => clearInterval(timer);
  }, [refreshQr]);

  if (!isAuthenticated) {
    return (
      <main className="operator-page container-wide">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <FlashRegular style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: 16 }} />
          <h2>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Please sign in with your operator credentials to access the console.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </main>
    );
  }

  if (user?.role !== 'operator' && user?.role !== 'admin') {
    return (
      <main className="operator-page container-wide">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <WarningRegular style={{ fontSize: '3rem', color: '#EF4444', marginBottom: 16 }} />
          <h2>Operator Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Your current role ({user?.role}) does not have permissions for the CPO console.</p>
          <Link to="/" className="btn-secondary">Return Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="operator-page container-wide">
      <GlowBlob color="green" size={180} top="-60px" left="-60px" />

      <header className="operator-page__header">
        <div>
          <span className="discover__eyebrow">
            <BuildingRegular /> CPO Console
          </span>
          <h1>Station <span className="tiranga-gradient-text">Operator</span></h1>
          <p>Manage your charging stations, live schedules, dynamic HMAC QR rotation, and API integration.</p>
        </div>
        <button className="btn-primary" disabled={loading} onClick={sync}>
          <ArrowSyncRegular /> {loading ? 'Syncing…' : 'Sync mock feed'}
        </button>
      </header>

      {message && (
        <p className="operator-page__message">
          <WarningRegular /> {message}
        </p>
      )}

      {/* Tabs */}
      <nav className="operator-page__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`operator-page__tab ${activeTab === t.key ? 'operator-page__tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            id={`op-tab-${t.key}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {/* ── Stations Tab ── */}
        {activeTab === 'stations' && (
          <motion.div
            key="stations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <section className="operator-page__grid">
              <div className="operator-page__stations glass">
                {stations.map((station) => (
                  <button
                    key={station.id}
                    className={selected?.id === station.id
                      ? 'operator-page__station operator-page__station--active'
                      : 'operator-page__station'}
                    onClick={() => setSelected(station)}
                  >
                    <strong>{station.name}</strong>
                    <span>{station.city} · {station.availableConnectors} connector(s) available</span>
                    <small>{station.bookings?.length || 0} active booking(s)</small>
                  </button>
                ))}
                {stations.length === 0 && (
                  <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No stations synced. Click "Sync mock feed" above.</p>
                )}
              </div>

              <div className="operator-page__display glass">
                {selected ? (
                  <>
                    <div className="operator-page__display-head">
                      <div>
                        <p>Station display — rotating secure token</p>
                        <h2>{selected.name}</h2>
                      </div>
                      <button className="btn-secondary btn-sm" onClick={refreshQr}>
                        Rotate now
                      </button>
                    </div>

                    <div className="operator-page__qr">
                      <QrCodeRegular />
                      <code>{qr?.token || 'Generating signed QR…'}</code>
                    </div>

                    <p className="operator-page__expiry">
                      Expires {qr ? new Date(qr.expiresAt).toLocaleTimeString() : '—'} · changes every 30 seconds · HMAC signed
                    </p>

                    <div className="operator-page__connectors">
                      {selected.connectors.map((connector) => (
                        <div key={connector.id}>
                          <strong>{connector.standard}</strong>
                          <span>{connector.maxPowerKw} kW</span>
                          <em className={`discover__status discover__status--${connector.status.toLowerCase().replaceAll('_', '-')}`}>
                            {connector.status}
                          </em>
                        </div>
                      ))}
                    </div>

                    <Link
                      to={`/charging-point/${selected.id}`}
                      className="operator-page__cp-link"
                    >
                      <PlugConnectedRegular /> Open Charging Point Test Page <ArrowRightRegular />
                    </Link>
                  </>
                ) : (
                  <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No synced station is available.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── Schedules Tab ── */}
        {activeTab === 'schedules' && (
          <motion.div
            key="schedules"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="operator-page__schedules">
              {stations.flatMap((st) =>
                (st.bookings || []).map((b) => (
                  <div key={b.id} className="operator-page__booking-card">
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Station</span>
                      <span className="operator-page__booking-value">{st.name}</span>
                    </div>
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Slot Start</span>
                      <span className="operator-page__booking-value">
                        {new Date(b.slotStart).toLocaleString()}
                      </span>
                    </div>
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Slot End</span>
                      <span className="operator-page__booking-value">
                        {new Date(b.slotEnd).toLocaleString()}
                      </span>
                    </div>
                    <span className={`operator-page__booking-status operator-page__booking-status--${b.status?.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </div>
                ))
              )}
              {stations.every((st) => !st.bookings?.length) && (
                <div className="glass" style={{ padding: 36, textAlign: 'center', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <CalendarRegular style={{ fontSize: '2rem', marginBottom: 8 }} />
                  <p>No active bookings across your connected stations.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── API Tab ── */}
        {activeTab === 'api' && (
          <motion.div
            key="api"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="operator-page__api-section">
              <div className="operator-page__api-card glass">
                <h3>🔌 API Base URL</h3>
                <p>Use this base URL for all CPO & driver integrations:</p>
                <div className="operator-page__api-endpoint">{API_URL}/api/v1</div>
              </div>

              <div className="operator-page__api-card glass">
                <h3>📡 Key Endpoints</h3>
                <p>Authenticate with your JWT token in the Authorization header:</p>
                <div className="operator-page__api-endpoint" style={{ marginBottom: 12 }}>
                  Authorization: Bearer {'<your-token>'}
                </div>
                <p><strong>GET</strong> /api/v1/stations — List all stations</p>
                <p><strong>GET</strong> /api/v1/stations/nearby?lat=X&lng=Y — Nearby stations</p>
                <p><strong>GET</strong> /api/v1/availability?stationId=X — Connector status</p>
                <p><strong>POST</strong> /api/v1/bookings — Create booking</p>
                <p><strong>POST</strong> /api/v1/operator/mock-stations/sync — Sync mock feed</p>
              </div>

              <div className="operator-page__api-card glass">
                <h3>📚 Interactive Documentation</h3>
                <p>Swagger documentation with try-it-out live request testing:</p>
                <a
                  href={`${API_URL}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-sm"
                  style={{ marginTop: 12, display: 'inline-flex' }}
                >
                  Open API Docs <ArrowRightRegular />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
