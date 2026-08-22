import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  QrCodeRegular,
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  PlayRegular,
  PauseRegular,
  StopRegular,
  ArrowSyncRegular,
  ReceiptRegular,
  VehicleCarRegular,
  TimerRegular,
  MoneyRegular,
  BuildingRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import './Kiosk.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

// ── Deterministic Canvas QR Generator ──
function drawKioskQR(canvas, text, size = 200) {
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

export default function Kiosk() {
  const { stationId: routeStationId } = useParams();
  const [stationList, setStationList] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(routeStationId || null);
  const [kioskState, setKioskState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const qrCanvasRef = useRef(null);

  // Kiosk hardware simulation controls
  const [cablePlugged, setCablePlugged] = useState(false);
  const [simStreaming, setSimStreaming] = useState(false);
  const [livePowerKw, setLivePowerKw] = useState(50);
  const [liveVoltage, setLiveVoltage] = useState(400);
  const [liveCurrent, setLiveCurrent] = useState(125);
  const [liveSoc, setLiveSoc] = useState(35);
  const [cumulativeEnergyWh, setCumulativeEnergyWh] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock ticker
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch station list if none selected
  useEffect(() => {
    fetch(`${API_URL}/api/v1/stations`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data || [];
        setStationList(list);
        if (!selectedStationId && list.length > 0) {
          setSelectedStationId(list[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, [selectedStationId]);

  // Fetch Kiosk State
  const fetchState = useCallback(async () => {
    if (!selectedStationId) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/state`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch kiosk state');
      setKioskState(data.data);

      if (data.data?.activeSession) {
        setCumulativeEnergyWh(data.data.activeSession.energyWh || 0);
        setCablePlugged(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStationId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Draw QR
  useEffect(() => {
    if (kioskState?.qr?.token && qrCanvasRef.current) {
      drawKioskQR(qrCanvasRef.current, kioskState.qr.token, 200);
    }
  }, [kioskState?.qr?.token]);

  // Telemetry streaming tick
  useEffect(() => {
    let timer;
    if (simStreaming && kioskState?.activeSession) {
      timer = setInterval(async () => {
        // Increment energy & SoC
        const deltaWh = Math.round((livePowerKw * 1000 / 3600) * 2); // 2-second increment
        const nextWh = cumulativeEnergyWh + deltaWh;
        const nextSoc = Math.min(100, liveSoc + 0.2);

        setCumulativeEnergyWh(nextWh);
        setLiveSoc(Math.round(nextSoc * 10) / 10);

        try {
          await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectorId: kioskState.connector.id,
              energyWh: nextWh,
              powerKw: livePowerKw,
              voltage: liveVoltage,
              current: liveCurrent,
              socPercent: nextSoc,
            }),
          });
        } catch {
          // ignore telemetry transient drop
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [simStreaming, kioskState?.activeSession, cumulativeEnergyWh, livePowerKw, liveVoltage, liveCurrent, liveSoc, selectedStationId, kioskState?.connector?.id]);

  // Direct Hardware Start
  const handleHardwareStart = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: kioskState?.connector?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start charge from kiosk');
      setCablePlugged(true);
      setSimStreaming(true);
      setInvoice(null);
      await fetchState();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hardware Stop
  const handleHardwareStop = async () => {
    try {
      setLoading(true);
      setSimStreaming(false);
      const res = await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/stop-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: kioskState?.connector?.id,
          finalEnergyWh: cumulativeEnergyWh,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to stop session');
      setInvoice(json.data.invoice);
      await fetchState();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isCharging = !!kioskState?.activeSession;
  const isReserved = !!kioskState?.activeBooking && !isCharging;
  const liveCost = kioskState?.activeSession
    ? Math.round(((cumulativeEnergyWh / 1000) * (kioskState.tariff?.pricePerKwh || 12.5) + (kioskState.tariff?.flatFee || 20)) * 100) / 100
    : 0;

  return (
    <div className="kiosk-page">
      <div className="kiosk-container">
        {/* ── Left: Kiosk Terminal ── */}
        <div className="kiosk-terminal">
          {/* Header */}
          <div className="kiosk-header">
            <div className="kiosk-brand">
              <div className="kiosk-brand-icon">
                <FlashRegular />
              </div>
              <div className="kiosk-station-info">
                <h2>{kioskState?.station?.name || 'EV Charger Kiosk'}</h2>
                <p>{kioskState?.station?.city} · {kioskState?.connector?.standard || 'CCS2'} · {kioskState?.connector?.maxPowerKw || 60} kW</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)', color: '#94a3b8' }}>
                <TimerRegular style={{ verticalAlign: 'middle', marginRight: 4 }} /> {currentTime}
              </span>
              <div className={`kiosk-status-pill ${isCharging ? 'kiosk-status-pill--charging' : isReserved ? 'kiosk-status-pill--reserved' : 'kiosk-status-pill--available'}`}>
                {isCharging ? '⚡ CHARGING' : isReserved ? '🕒 RESERVED' : '● AVAILABLE'}
              </div>
            </div>
          </div>

          {/* Screen Body */}
          <div className="kiosk-screen">
            {invoice ? (
              /* ── Invoice Screen ── */
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CheckmarkCircleRegular style={{ fontSize: '3.5rem', color: '#10b981', marginBottom: 12 }} />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Charging Session Completed</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>Thank you for using ChargeGrid. Payment is ready in the user app.</p>

                <div className="kiosk-invoice-card">
                  <div className="kiosk-invoice-row">
                    <span>Energy Delivered</span>
                    <strong style={{ color: '#f8fafc' }}>{invoice.energyDeliveredKwh} kWh</strong>
                  </div>
                  <div className="kiosk-invoice-row">
                    <span>Duration</span>
                    <span>{invoice.durationMinutes} mins</span>
                  </div>
                  <div className="kiosk-invoice-row">
                    <span>Base Energy Rate</span>
                    <span>{invoice.tariffRate}</span>
                  </div>
                  <div className="kiosk-invoice-row">
                    <span>Connection Flat Fee</span>
                    <span>₹{invoice.flatConnectionFee}</span>
                  </div>
                  <div className="kiosk-invoice-row kiosk-invoice-row--total">
                    <span>Total Amount</span>
                    <span>₹{invoice.totalAmount} INR</span>
                  </div>
                </div>

                <button className="btn-primary" onClick={() => setInvoice(null)} style={{ marginTop: 24 }}>
                  Back to Terminal Screen
                </button>
              </motion.div>
            ) : isCharging ? (
              /* ── Active Charging View ── */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <PlugConnectedRegular style={{ fontSize: '1.4rem', color: '#38bdf8' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>Vehicle Connected & Charging</span>
                </div>

                {/* Battery SoC */}
                <div className="kiosk-battery-container" style={{ margin: '0 auto' }}>
                  <div className="kiosk-battery-header">
                    <span>Battery State of Charge (SoC)</span>
                    <span style={{ color: '#38bdf8' }}>{liveSoc}%</span>
                  </div>
                  <div className="kiosk-battery-track">
                    <div className="kiosk-battery-fill" style={{ width: `${liveSoc}%` }} />
                  </div>
                </div>

                {/* Live Telemetry Grid */}
                <div className="kiosk-telemetry-grid">
                  <div className="kiosk-metric-card">
                    <span className="kiosk-metric-label">Power Output</span>
                    <div className="kiosk-metric-value">{livePowerKw}<span className="kiosk-metric-unit"> kW</span></div>
                  </div>
                  <div className="kiosk-metric-card">
                    <span className="kiosk-metric-label">Voltage / Current</span>
                    <div className="kiosk-metric-value" style={{ fontSize: '1.3rem' }}>{liveVoltage}V / {liveCurrent}A</div>
                  </div>
                  <div className="kiosk-metric-card">
                    <span className="kiosk-metric-label">Energy Delivered</span>
                    <div className="kiosk-metric-value">{(cumulativeEnergyWh / 1000).toFixed(2)}<span className="kiosk-metric-unit"> kWh</span></div>
                  </div>
                </div>

                {/* Live Cost */}
                <div className="kiosk-live-cost">
                  <span className="kiosk-metric-label" style={{ color: '#34d399' }}>Live Running Cost</span>
                  <div className="kiosk-cost-amount">₹{liveCost.toFixed(2)}</div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tariff: ₹{kioskState?.tariff?.pricePerKwh || 12.5}/kWh + ₹{kioskState?.tariff?.flatFee || 20} flat fee</span>
                </div>
              </motion.div>
            ) : (
              /* ── Idle / Reserved / QR View ── */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {isReserved ? (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1.05rem', color: '#fbbf24', margin: '0 0 4px 0' }}>Reserved for {kioskState.activeBooking.user?.name || 'EV Driver'}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                      Slot: {new Date(kioskState.activeBooking.slotStart).toLocaleTimeString()} - {new Date(kioskState.activeBooking.slotEnd).toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>Scan QR with ChargeGrid App</h3>
                )}

                <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
                  Scan the rotating HMAC code to confirm slot arrival and start DC fast charging.
                </p>

                <div className={`kiosk-qr-halo-wrapper ${isReserved ? 'kiosk-qr-halo--reserved' : 'kiosk-qr-halo--available'}`}>
                  <div className="kiosk-qr-box">
                    <canvas ref={qrCanvasRef} width={200} height={200} />
                  </div>
                  <div className={`kiosk-qr-status-tag ${isReserved ? 'kiosk-qr-status-tag--reserved' : 'kiosk-qr-status-tag--available'}`}>
                    {isReserved ? '🔴 RESERVED / SLOT ACTIVE' : '🟢 OPEN / READY TO SCAN'}
                  </div>
                </div>

                <div className="kiosk-qr-notice">
                  Rotating security token · Expires {kioskState?.qr ? new Date(kioskState.qr.expiresAt).toLocaleTimeString() : '—'}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="kiosk-footer">
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Charger ID: <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>{selectedStationId?.slice(0, 8)}...</span>
            </div>

            {isCharging && (
              <button className="btn-kiosk-stop" onClick={handleHardwareStop} disabled={loading}>
                <StopRegular /> Stop Charge & Dispense Bill
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Hardware Controls Simulator Panel ── */}
        <div className="kiosk-hardware-panel">
          <h3>
            <VehicleCarRegular /> Hardware Simulator
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
            Simulate physical kiosk sensors, EV plug connections, and live power pulses sent from EVSE microcontrollers.
          </p>

          {/* Select Station */}
          <div className="hardware-control-group">
            <label className="hardware-control-label">Select Charging Station</label>
            <select
              style={{ padding: '10px 14px', borderRadius: 10, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '0.88rem' }}
              value={selectedStationId || ''}
              onChange={(e) => setSelectedStationId(e.target.value)}
            >
              {stationList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
              ))}
            </select>
          </div>

          {/* EV Cable Plug */}
          <div className="hardware-control-group">
            <label className="hardware-control-label">EV Cable Connection</label>
            <button
              className={`hardware-toggle-btn ${cablePlugged ? 'hardware-toggle-btn--active' : ''}`}
              onClick={() => setCablePlugged(!cablePlugged)}
            >
              {cablePlugged ? <PlugConnectedRegular /> : <PlugDisconnectedRegular />}
              {cablePlugged ? 'Cable Connected & Locked' : 'Cable Disconnected'}
            </button>
          </div>

          {/* Direct Start / Telemetry Stream */}
          {!isCharging ? (
            <button className="btn-primary" onClick={handleHardwareStart} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              <PlayRegular /> Plug & Authorize Session
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="hardware-control-group">
                <label className="hardware-control-label">Telemetry Output (kW)</label>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={livePowerKw}
                  onChange={(e) => setLivePowerKw(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', textAlign: 'right' }}>{livePowerKw} kW Output</span>
              </div>

              <button
                className={`hardware-toggle-btn ${simStreaming ? 'hardware-toggle-btn--active' : ''}`}
                onClick={() => setSimStreaming(!simStreaming)}
              >
                {simStreaming ? <PauseRegular /> : <PlayRegular />}
                {simStreaming ? 'Streaming Telemetry (2s interval)' : 'Resume Telemetry Stream'}
              </button>

              <button className="btn-kiosk-stop" onClick={handleHardwareStop} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                <StopRegular /> Stop Charge (Hardware)
              </button>
            </div>
          )}

          {/* Open App view shortcut */}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16 }}>
            <Link to="/discover" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
              Open Driver App / Booking View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
