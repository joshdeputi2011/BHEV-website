import { useCallback, useEffect, useState, useRef } from 'react';
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
  AddRegular,
  StarRegular,
  DismissRegular,
  LocationRegular,
  MoneyRegular,
  GaugeRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Operator.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

const TABS = [
  { key: 'stations', label: 'My Stations', icon: <BuildingRegular /> },
  { key: 'schedules', label: 'Live Schedules', icon: <CalendarRegular /> },
  { key: 'ratings', label: 'Ratings & Reviews', icon: <StarRegular /> },
  { key: 'api', label: 'API & Integration', icon: <KeyRegular /> },
];

// ── Deterministic Canvas QR Generator ──
function drawOperatorQR(canvas, text, size = 180) {
  if (!canvas || !text) return;
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const modules = 25;
  const cellSize = size / modules;
  ctx.fillStyle = '#02060d';

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const drawFinder = (x, y) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          ctx.fillRect((x + c) * cellSize, (y + r) * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  let seed = Math.abs(hash);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c > modules - 9) || (r > modules - 9 && c < 8)) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

export default function Operator() {
  const { token, user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('stations');
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const qrCanvasRef = useRef(null);

  // New Station Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    latitude: 12.9352,
    longitude: 77.6245,
    connectorStandard: 'CCS2',
    powerType: 'DC',
    maxPowerKw: 60,
    pricePerKwh: 14.5,
    flatFee: 20,
    rating: 4.9,
  });

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

  // Load operator stations
  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await request('/api/v1/operator/stations');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load operator stations');
      const data = payload.data || [];
      setStations(data);
      if (!selected && data.length > 0) {
        setSelected(data[0]);
      } else if (selected) {
        const found = data.find((s) => s.id === selected.id);
        if (found) setSelected(found);
      }
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setLoading(false);
    }
  }, [request, selected]);

  const sync = async () => {
    setLoading(true);
    try {
      const response = await request('/api/v1/operator/mock-stations/sync', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sync failed');
      setMessage(`Normalized ${payload.data.locations} stations and ${payload.data.connectors} connectors.`);
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
      // ignore
    }
  }, [request, selected]);

  useEffect(() => { if (isAuthenticated) load(); }, [load, isAuthenticated]);
  useEffect(() => {
    refreshQr();
    const timer = setInterval(refreshQr, 30_000);
    return () => clearInterval(timer);
  }, [refreshQr]);

  // Draw canvas QR
  useEffect(() => {
    if (qr?.token && qrCanvasRef.current) {
      drawOperatorQR(qrCanvasRef.current, qr.token, 180);
    }
  }, [qr?.token]);

  // GPS auto-locate
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          }));
        },
        (err) => alert(`Geolocation error: ${err.message}`)
      );
    } else {
      alert('Geolocation not supported by your browser.');
    }
  };

  // Add new station submit
  const handleCreateStation = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await request('/api/v1/operator/stations', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create station');
      setMessage('✅ ' + (json.message || 'Station added successfully!'));
      setShowAddModal(false);
      await load();
      if (json.data) setSelected(json.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="operator-page container-wide">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <FlashRegular style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: 16 }} />
          <h2>Operator Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Please sign in to manage your charging station network.</p>
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
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Your account role ({user?.role}) does not have permissions for the CPO console.</p>
          <Link to="/" className="btn-secondary">Return Home</Link>
        </div>
      </main>
    );
  }

  // Check if selected station is in use
  const selectedConnector = selected?.connectors?.[0];
  const isStationOccupied = selectedConnector?.status === 'CHARGING' || selectedConnector?.status === 'RESERVED';

  return (
    <main className="operator-page container-wide">
      <GlowBlob color="green" size={180} top="-60px" left="-60px" />

      <header className="operator-page__header">
        <div>
          <span className="discover__eyebrow">
            <BuildingRegular /> CPO Control Room
          </span>
          <h1>Operator <span className="tiranga-gradient-text">Console</span></h1>
          <p>Deploy and monitor your EV charging stations, live schedules, ratings, and telemetry.</p>
        </div>

        <div className="operator-page__actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <AddRegular /> Add New Station
          </button>
          <button className="btn-secondary btn-sm" disabled={loading} onClick={sync}>
            <ArrowSyncRegular /> {loading ? 'Syncing...' : 'Sync Feed'}
          </button>
        </div>
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
        {/* ── Tab 1: Stations ── */}
        {activeTab === 'stations' && (
          <motion.div key="stations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <section className="operator-page__grid">
              {/* Left Station List */}
              <div className="operator-page__stations glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    My Stations ({stations.length})
                  </span>
                  <button className="btn-secondary btn-sm" onClick={() => setShowAddModal(true)} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                    + Add
                  </button>
                </div>

                {stations.map((station) => {
                  const conn = station.connectors?.[0];
                  const inUse = conn?.status === 'CHARGING' || conn?.status === 'RESERVED';
                  return (
                    <button
                      key={station.id}
                      className={selected?.id === station.id ? 'operator-page__station operator-page__station--active' : 'operator-page__station'}
                      onClick={() => setSelected(station)}
                    >
                      <div className="operator-page__station-head">
                        <strong>{station.name}</strong>
                        <span className="operator-page__rating-badge">
                          <StarRegular /> {station.rating?.toFixed(1) || '4.8'}
                        </span>
                      </div>
                      <span>{station.city} · {conn?.standard || 'CCS2'} ({conn?.maxPowerKw || 60} kW)</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <small style={{ color: inUse ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                          {inUse ? '🔴 In Use' : '🟢 Ready / Open'}
                        </small>
                        <small style={{ color: 'var(--text-muted)' }}>
                          ₹{station.tariff?.pricePerKwh || 12.5}/kWh
                        </small>
                      </div>
                    </button>
                  );
                })}

                {stations.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <BuildingRegular style={{ fontSize: '2rem', marginBottom: 8 }} />
                    <p style={{ margin: '0 0 12px' }}>No stations added yet.</p>
                    <button className="btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Your First Station</button>
                  </div>
                )}
              </div>

              {/* Right Detail Panel */}
              <div className="operator-page__display glass">
                {selected ? (
                  <>
                    <div className="operator-page__display-head">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h2>{selected.name}</h2>
                          <span className="operator-page__rating-badge" style={{ fontSize: '0.85rem' }}>
                            <StarRegular /> {selected.rating?.toFixed(1) || '4.8'} / 5.0
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.84rem', margin: '4px 0 0' }}>
                          <LocationRegular style={{ verticalAlign: 'middle', marginRight: 4 }} /> {selected.address}, {selected.city} ({selected.latitude}, {selected.longitude})
                        </p>
                      </div>

                      <button className="btn-secondary btn-sm" onClick={refreshQr}>
                        Rotate QR
                      </button>
                    </div>

                    {/* Dynamic QR Box with Green / Red Halo */}
                    <div className={`operator-qr-container ${isStationOccupied ? 'operator-qr-container--in-use' : 'operator-qr-container--available'}`}>
                      <div className="operator-qr-canvas-box">
                        <canvas ref={qrCanvasRef} width={180} height={180} />
                      </div>

                      <div className={`operator-qr-halo-status ${isStationOccupied ? 'operator-qr-halo-status--in-use' : 'operator-qr-halo-status--available'}`}>
                        {isStationOccupied ? '🔴 IN USE / OCCUPIED' : '🟢 READY / OPEN FOR CHARGING'}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 8, textAlign: 'center' }}>
                        {isStationOccupied
                          ? 'Charger is actively in a charging session. Scan disabled until completed.'
                          : 'Static / dynamic QR open for instant driver walk-in scan or advance booking.'}
                      </p>
                    </div>

                    {/* Specs Strip */}
                    <div className="operator-specs-grid">
                      <div className="operator-spec-card">
                        <span className="operator-spec-label">Connector</span>
                        <div className="operator-spec-value">{selectedConnector?.standard || 'CCS2'}</div>
                      </div>
                      <div className="operator-spec-card">
                        <span className="operator-spec-label">Max Power</span>
                        <div className="operator-spec-value">{selectedConnector?.maxPowerKw || 60} kW</div>
                      </div>
                      <div className="operator-spec-card">
                        <span className="operator-spec-label">Tariff Rate</span>
                        <div className="operator-spec-value" style={{ color: '#10b981' }}>₹{selected.tariff?.pricePerKwh || 12.5}/kWh</div>
                      </div>
                      <div className="operator-spec-card">
                        <span className="operator-spec-label">Connection Fee</span>
                        <div className="operator-spec-value">₹{selected.tariff?.flatFee || 20}</div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                      <Link to={`/kiosk/${selected.id}`} className="btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <GaugeRegular /> Launch Kiosk Touchscreen Simulator <ArrowRightRegular />
                      </Link>
                      <Link to={`/charging-point/${selected.id}`} className="btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <PlugConnectedRegular /> Test Point Verification
                      </Link>
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>Select a station from the left list.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── Tab 2: Schedules ── */}
        {activeTab === 'schedules' && (
          <motion.div key="schedules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="operator-page__schedules">
              {stations.flatMap((st) =>
                (st.bookings || []).map((b) => (
                  <div key={b.id} className="operator-page__booking-card glass">
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Station</span>
                      <span className="operator-page__booking-value">{st.name}</span>
                      <small style={{ color: 'var(--text-tertiary)' }}>{st.city}</small>
                    </div>
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Driver</span>
                      <span className="operator-page__booking-value">{b.user?.name || 'EV Driver'}</span>
                      <small style={{ color: 'var(--text-tertiary)' }}>{b.user?.email || 'Registered User'}</small>
                    </div>
                    <div className="operator-page__booking-field">
                      <span className="operator-page__booking-label">Reserved Window</span>
                      <span className="operator-page__booking-value">{new Date(b.slotStart).toLocaleTimeString()} - {new Date(b.slotEnd).toLocaleTimeString()}</span>
                      <small style={{ color: 'var(--text-tertiary)' }}>{new Date(b.slotStart).toLocaleDateString()}</small>
                    </div>
                    <div>
                      <span className={`operator-page__booking-status operator-page__booking-status--${b.status?.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {stations.every((st) => !st.bookings?.length) && (
                <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', borderRadius: 20 }}>
                  <CalendarRegular style={{ fontSize: '2.5rem', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No Bookings Active</h3>
                  <p style={{ margin: 0 }}>Drivers who book slots on your stations will appear here in real-time.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Tab 3: Ratings & Feedback ── */}
        {activeTab === 'ratings' && (
          <motion.div key="ratings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {stations.map((st) => (
                <div key={st.id} className="glass" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{st.name}</strong>
                    <span className="operator-page__rating-badge" style={{ fontSize: '0.9rem' }}>
                      <StarRegular /> {st.rating?.toFixed(1) || '4.8'} ⭐
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', margin: 0 }}>{st.city} · {st.connectors?.[0]?.standard || 'CCS2'}</p>
                  
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 14, marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                      <span>Network Reliability Score</span>
                      <strong style={{ color: '#10b981' }}>{st.reliability?.score || 96}%</strong>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-surface)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${st.reliability?.score || 96}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #38bdf8)' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <em>"Fast charging speeds and hassle-free QR scan confirmation."</em>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tab 4: API & Integration ── */}
        {activeTab === 'api' && (
          <motion.div key="api" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="operator-page__api-section">
              <div className="operator-page__api-card glass">
                <h3>🔌 API Base URL</h3>
                <div className="operator-page__api-endpoint">{API_URL}/api/v1</div>
              </div>

              <div className="operator-page__api-card glass">
                <h3>📡 Operator Endpoints</h3>
                <p><strong>POST</strong> /api/v1/operator/stations — Register a new station</p>
                <p><strong>GET</strong> /api/v1/operator/stations — List all stations under your account</p>
                <p><strong>POST</strong> /api/v1/kiosk/:stationId/telemetry — Stream charger hardware pulses</p>
                <p><strong>POST</strong> /api/v1/kiosk/:stationId/stop-session — Emergency / remote stop charge</p>
              </div>

              <div className="operator-page__api-card glass">
                <h3>📚 Swagger Interactive Documentation</h3>
                <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" style={{ display: 'inline-flex', gap: 8, marginTop: 8 }}>
                  Open Swagger UI <ArrowRightRegular />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Station Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="station-modal-backdrop">
            <motion.div className="station-modal" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>➕ Add New Charging Station</h2>
                <button className="btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                  <DismissRegular />
                </button>
              </div>

              <form onSubmit={handleCreateStation} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Koramangala HyperCharge DC Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 80 Feet Road, 4th Block, Koramangala"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="station-modal-grid">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="station-modal-grid">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <button type="button" className="btn-secondary btn-sm" onClick={handleUseCurrentLocation} style={{ alignSelf: 'flex-start' }}>
                  <LocationRegular /> Use My Current GPS Coordinates
                </button>

                <div className="station-modal-grid">
                  <div className="form-group">
                    <label className="form-label">Charger Standard</label>
                    <select
                      className="form-input"
                      value={formData.connectorStandard}
                      onChange={(e) => setFormData({ ...formData, connectorStandard: e.target.value })}
                    >
                      <option value="CCS2">CCS2 (DC Fast Charger)</option>
                      <option value="Type2">Type 2 (AC 3-Phase)</option>
                      <option value="GBT_DC">GB/T DC (Commercial EV)</option>
                      <option value="GBT_AC">GB/T AC</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Wattage / Power (kW)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.maxPowerKw}
                      onChange={(e) => setFormData({ ...formData, maxPowerKw: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="station-modal-grid">
                  <div className="form-group">
                    <label className="form-label">Price per kWh (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formData.pricePerKwh}
                      onChange={(e) => setFormData({ ...formData, pricePerKwh: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Flat Connection Fee (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.flatFee}
                      onChange={(e) => setFormData({ ...formData, flatFee: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Rating (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    className="form-input"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 14, marginTop: 8 }}>
                  {loading ? 'Creating Station...' : 'Deploy & Activate Station'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
