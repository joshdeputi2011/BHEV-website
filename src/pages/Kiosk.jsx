import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  FlashFilled,
  QrCodeRegular,
  PlugConnectedRegular,
  PlugConnectedFilled,
  PlugDisconnectedRegular,
  PlayRegular,
  PlayFilled,
  StopRegular,
  StopFilled,
  ArrowSyncRegular,
  ReceiptRegular,
  VehicleCarRegular,
  TimerRegular,
  MoneyRegular,
  BuildingRegular,
  CheckmarkCircleRegular,
  CheckmarkCircleFilled,
  DismissRegular,
  GaugeRegular,
  WarningRegular,
  DocumentRegular,
} from '@fluentui/react-icons';
import urjaaLogo from '../assets/urjaa.svg';
import QRCode from 'qrcode';
import { API_URL } from '../utils/apiConfig';
import './Kiosk.css';

async function drawKioskQR(canvas, text, size = 200) {
  if (!canvas || !text) return;
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#02060d',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to render kiosk QR code:', err);
  }
}

export default function Kiosk() {
  const { stationId: routeStationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStationId = routeStationId || searchParams.get('stationId');
  const urlChargerId = searchParams.get('chargerId') || searchParams.get('connectorId');

  const [stationList, setStationList] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(urlStationId || null);
  const [selectedChargerId, setSelectedChargerId] = useState(urlChargerId || null);
  const [kioskState, setKioskState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const qrCanvasRef = useRef(null);

  // Hardware Simulation State
  const [cablePlugged, setCablePlugged] = useState(false);
  const [simStreaming, setSimStreaming] = useState(false);
  const [livePowerKw, setLivePowerKw] = useState(58.4);
  const [liveVoltage, setLiveVoltage] = useState(400);
  const [liveCurrent, setLiveCurrent] = useState(146);
  const [liveSoc, setLiveSoc] = useState(35);
  const [cumulativeEnergyWh, setCumulativeEnergyWh] = useState(5400);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock ticker
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch Station List
  useEffect(() => {
    fetch(`${API_URL}/api/v1/stations`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data || [];
        let customList = [];
        try {
          const stored = localStorage.getItem('bhev_custom_stations');
          if (stored) customList = JSON.parse(stored);
        } catch (e) {
          // ignore
        }
        const merged = [...customList, ...list];
        const unique = merged.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
        setStationList(unique);
        if (!selectedStationId && unique.length > 0) {
          setSelectedStationId(unique[0].id);
        }
      })
      .catch(() => {
        setStationList([]);
      });
  }, [selectedStationId]);

  // Sync selected station from URL if changed
  useEffect(() => {
    if (urlStationId && urlStationId !== selectedStationId) {
      setSelectedStationId(urlStationId);
    }
  }, [urlStationId, selectedStationId]);

  // Sync selected charger from URL if changed
  useEffect(() => {
    if (urlChargerId && urlChargerId !== selectedChargerId) {
      setSelectedChargerId(urlChargerId);
    }
  }, [urlChargerId, selectedChargerId]);

  // Fetch Kiosk State for selected station & charger
  const fetchState = useCallback(async () => {
    if (!selectedStationId) return;
    try {
      const url = selectedChargerId
        ? `${API_URL}/api/v1/kiosk/${selectedStationId}/state?connectorId=${selectedChargerId}`
        : `${API_URL}/api/v1/kiosk/${selectedStationId}/state`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data) {
        setKioskState(data.data);
        if (!selectedChargerId && data.data.connector?.id) {
          setSelectedChargerId(data.data.connector.id);
        }
        if (data.data.activeSession) {
          setCablePlugged(true);
          setSimStreaming(true);
          setLiveSoc(data.data.activeSession.socPercent || 48);
          setCumulativeEnergyWh(data.data.activeSession.energyWh || 6000);
        }
      } else {
        const matched = stationList.find((s) => s.id === selectedStationId);
        if (matched) {
          const connectors = matched.connectors?.length ? matched.connectors : [
            {
              id: `${matched.id}-conn-01`,
              standard: 'CCS2',
              powerType: 'DC',
              maxPowerKw: matched.maxPowerKw || 60,
              status: 'AVAILABLE',
              tariff: { pricePerKwh: 14.5, flatFee: 20.0 }
            }
          ];
          const activeConn = connectors.find((c) => c.id === selectedChargerId) || connectors[0];
          setKioskState({
            station: {
              id: matched.id,
              name: matched.name,
              address: matched.address || matched.location || '',
              city: matched.city || '',
              connectors,
              status: 'ACTIVE'
            },
            connector: activeConn,
            connectors,
            tariff: activeConn.tariff || { pricePerKwh: 14.5, flatFee: 20.0 },
            qr: {
              token: `UEI-KIOSK-${selectedStationId.slice(0, 8)}-${activeConn.id.slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`,
              expiresAt: new Date(Date.now() + 30000).toISOString()
            },
            activeSession: null
          });
        }
      }
    } catch (err) {
      console.warn('Kiosk state fetch notice:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStationId, selectedChargerId, stationList]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Derived Connectors List
  const activeStation = stationList.find((s) => s.id === selectedStationId) || kioskState?.station;
  const availableConnectors = kioskState?.connectors?.length
    ? kioskState.connectors
    : activeStation?.connectors?.length
      ? activeStation.connectors
      : (kioskState?.connector ? [kioskState.connector] : [
          {
            id: 'CHG-DEFAULT',
            standard: 'CCS2',
            powerType: 'DC',
            maxPowerKw: 60,
            status: 'AVAILABLE',
            physicalReference: 'Bay #01 (DC Fast)'
          }
        ]);

  const activeConnector = availableConnectors.find((c) => c.id === selectedChargerId) || availableConnectors[0] || kioskState?.connector;

  // Draw QR and generate Data URL
  useEffect(() => {
    if (kioskState?.activeSession || simStreaming) {
      setQrDataUrl('');
      return;
    }
    const token =
      kioskState?.qr?.token ||
      `UEI-KIOSK-${String(selectedStationId || 'BHEV-01').slice(0, 8)}-${String(activeConnector?.id || 'CONN-01').slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`;

    QRCode.toDataURL(token, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#02060d',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((e) => console.error('QR data URL error:', e));

    if (qrCanvasRef.current) {
      drawKioskQR(qrCanvasRef.current, token, 200);
    }
  }, [kioskState?.qr?.token, kioskState?.activeSession, simStreaming, selectedStationId, activeConnector?.id]);

  // Telemetry stream interval
  useEffect(() => {
    let timer;
    if (simStreaming && cablePlugged) {
      const maxKw = activeConnector?.maxPowerKw || 60;
      const isAc = activeConnector?.powerType === 'AC' || activeConnector?.standard === 'Type2';
      const targetKw = isAc ? Math.min(maxKw, 22) : Math.min(maxKw, 58.4);
      const targetV = isAc ? 230 : 400;
      const targetA = isAc ? 32 : 146;

      timer = setInterval(() => {
        setSessionSeconds((s) => s + 2);
        setLivePowerKw(Number((targetKw + (Math.random() * 2 - 1)).toFixed(1)));
        setLiveVoltage(Math.round(targetV + (Math.random() * 4 - 2)));
        setLiveCurrent(Math.round(targetA + (Math.random() * 4 - 2)));
        setLiveSoc((soc) => Math.min(100, Number((soc + 0.25).toFixed(1))));
        setCumulativeEnergyWh((wh) => wh + 32);

        fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectorId: activeConnector?.id,
            powerKw: livePowerKw,
            voltage: liveVoltage,
            current: liveCurrent,
            soc: liveSoc,
            energyWh: cumulativeEnergyWh + 32,
            cost: Number((((cumulativeEnergyWh + 32) / 1000) * 14.5 + 20).toFixed(2))
          })
        }).catch(() => {});
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [simStreaming, cablePlugged, livePowerKw, liveVoltage, liveCurrent, liveSoc, cumulativeEnergyWh, selectedStationId, activeConnector]);

  // Start Charging Session
  const handleStartCharging = async () => {
    if (!cablePlugged) {
      alert('Please connect the charging gun to the vehicle first.');
      return;
    }
    try {
      await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: activeConnector?.id,
          driverName: 'Walk-in EV Driver',
          initialSoc: liveSoc
        })
      });
    } catch (e) {
      // ignore
    }
    setSimStreaming(true);
    setInvoice(null);
  };

  // Stop Charging Session
  const handleStopCharging = async () => {
    setSimStreaming(false);
    const energyKwh = Number((cumulativeEnergyWh / 1000).toFixed(2));
    const tariffRate = Number(kioskState?.tariff?.pricePerKwh || 14.5);
    const flatFee = Number(kioskState?.tariff?.flatFee || 20.0);
    const baseCost = Number((energyKwh * tariffRate + flatFee).toFixed(2));

    try {
      const res = await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/stop-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: activeConnector?.id,
          finalEnergyWh: cumulativeEnergyWh,
          finalCost: baseCost,
          driverName: 'EV Driver'
        })
      });
      const data = await res.json();
      if (data.data) {
        setInvoice(data.data);
      } else {
        throw new Error('Fallback invoice');
      }
    } catch (e) {
      const gst = Number((baseCost * 0.18).toFixed(2));
      setInvoice({
        invoiceId: `INV-UEI-${Math.floor(100000 + Math.random() * 900000)}`,
        stationId: selectedStationId,
        driverName: 'EV Driver',
        energyDeliveredKwh: energyKwh,
        chargingDurationMins: Math.round(energyKwh * 1.5) || 15,
        baseAmount: baseCost,
        gst18: gst,
        totalPaid: Number((baseCost + gst).toFixed(2)),
        paymentMethod: 'UPI / UEI Direct Debit',
        settlementStatus: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Switch Charger
  const handleSelectCharger = (chargerId) => {
    setSelectedChargerId(chargerId);
    setSearchParams({ stationId: selectedStationId, chargerId });
    setSimStreaming(false);
    setCablePlugged(false);
    setSessionSeconds(0);
    setCumulativeEnergyWh(100);
    setInvoice(null);
  };

  // Simulate Walk-in Driver Arrival
  const handleSimulateArrival = () => {
    setCablePlugged(true);
    setLiveSoc(25);
    setCumulativeEnergyWh(100);
    setSessionSeconds(0);
    setSimStreaming(true);
    setInvoice(null);
  };

  const energyKwh = (cumulativeEnergyWh / 1000).toFixed(2);
  const tariffRate = Number(kioskState?.tariff?.pricePerKwh || 14.5);
  const flatFee = Number(kioskState?.tariff?.flatFee || 20.0);
  const currentCost = (Number(energyKwh) * tariffRate + (simStreaming ? flatFee : 0)).toFixed(2);
  const activeSession = kioskState?.activeSession;
  const isCharging = simStreaming || !!activeSession;
  const isMaintenance = activeConnector?.status === 'MAINTENANCE';
  const visualState = kioskState?.visualState || (isCharging ? 'CHARGING' : isMaintenance ? 'MAINTENANCE' : 'FREE');
  const kioskTone = isMaintenance ? 'red' : String(kioskState?.kioskColor || (isCharging ? 'ORANGE' : 'GREEN')).toLowerCase();
  const carName = activeSession?.vehicleName || activeSession?.carName || 'Tata Nexon EV Max';

  return (
    <main className="kiosk-page">
      {/* ── Kiosk Top Status Bar ── */}
      <header className="kiosk-top-bar">
        <div className="kiosk-top-bar__left">
          <Link to="/discover" className="kiosk-brand">
            <img src={urjaaLogo} alt="URJAA Logo" className="kiosk-brand-logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span>URJAA KIOSK</span>
          </Link>
          <div className="kiosk-station-selector">
            <BuildingRegular />
            <select
              value={selectedStationId || ''}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setSelectedChargerId(null);
                setSearchParams({ stationId: e.target.value });
              }}
              className="kiosk-station-dropdown"
            >
              {stationList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="kiosk-top-bar__right">
          <div className="kiosk-time-display">
            <TimerRegular />
            <span>{currentTime}</span>
          </div>
          <div className="kiosk-net-status">
            <span className="kiosk-net-dot" />
            <span>UEI Grid Online</span>
          </div>
          <Link to="/operator" className="btn-secondary btn-xs">
            Operator Console
          </Link>
        </div>
      </header>

      {/* ── Main Kiosk Body ── */}
      <div className="kiosk-body container-wide">
        {/* ── Per-EV Charger Selector Bar ── */}
        <section className="kiosk-charger-bar glass">
          <div className="kiosk-charger-bar__label">
            <FlashRegular /> Select Specific EV Charger Bay:
          </div>
          <div className="kiosk-charger-pills">
            {availableConnectors.map((conn, idx) => {
              const isSel = (conn.id === activeConnector?.id);
              const isMaint = conn.status === 'MAINTENANCE';
              return (
                <button
                  key={conn.id || idx}
                  className={`kiosk-charger-pill ${isSel ? 'kiosk-charger-pill--active' : ''} ${isMaint ? 'kiosk-charger-pill--maintenance' : ''}`}
                  onClick={() => handleSelectCharger(conn.id)}
                >
                  <span className="kiosk-charger-pill__icon">
                    <FlashFilled />
                  </span>
                  <div className="kiosk-charger-pill__info">
                    <strong>{conn.physicalReference || `Bay #${idx + 1}`} • {conn.standard}</strong>
                    <small>
                      {conn.powerType || 'DC'} • {conn.maxPowerKw || 60} kW
                      <span className={`status-badge status-badge--${conn.status?.toLowerCase() || 'available'}`}>
                        {conn.status || 'AVAILABLE'}
                      </span>
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {isMaintenance && (
          <div className="kiosk-maint-banner">
            <WarningRegular />
            <span>
              <strong>BAY UNDER MAINTENANCE:</strong> This charging bay is currently offline for scheduled calibration. Please select another available bay above.
            </span>
          </div>
        )}

        <div className="kiosk-grid-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.4fr)', gap: 24 }}>
          {/* Left Column: Interactive QR Check-in Terminal */}
          <section className="kiosk-left glass">
            <div className="kiosk-panel-header">
              <div className="kiosk-step-pill">
                <QrCodeRegular /> Step 1: Scan &amp; Authorize
              </div>
              <h2>Universal Driver Check-in</h2>
              <p>Scan with URJAA mobile app or any UEI interoperable EV wallet for <strong>{activeConnector?.physicalReference || 'Bay #01'}</strong> ({activeConnector?.standard}).</p>
            </div>

            <div className={`kiosk-qr-box kiosk-qr-box--${kioskTone} ${isCharging ? 'kiosk-qr-box--active' : ''}`}>
              {isCharging ? (
                <div className="kiosk-live-session-card">
                  <VehicleCarRegular className="kiosk-live-session-card__icon" />
                  <strong>{carName}</strong>
                  <span>{visualState} • {liveSoc}% SoC</span>
                  <div>
                    <b>{livePowerKw} kW</b>
                    <b>{energyKwh} kWh</b>
                    <b>₹{currentCost}</b>
                  </div>
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Kiosk Check-in QR" className="kiosk-qr-img" width={200} height={200} style={{ width: 200, height: 200, display: 'block' }} />
              ) : (
                <canvas
                  ref={(node) => {
                    qrCanvasRef.current = node;
                    if (node && !isCharging) {
                      const token =
                        kioskState?.qr?.token ||
                        `UEI-KIOSK-${String(selectedStationId || 'BHEV-01').slice(0, 8)}-${String(activeConnector?.id || 'CONN-01').slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`;
                      drawKioskQR(node, token, 200);
                    }
                  }}
                  width={200}
                  height={200}
                  style={{ width: 200, height: 200, display: 'block' }}
                />
              )}
            </div>

            <div className="kiosk-qr-status">
              <span className={`kiosk-status-dot ${isCharging ? 'kiosk-status-dot--charging' : isMaintenance ? 'kiosk-status-dot--maintenance' : 'kiosk-status-dot--ready'}`} />
              <strong>{isCharging ? 'Charging in Progress' : isMaintenance ? 'Bay Under Maintenance' : visualState === 'BOOKED' ? 'Booked Driver Check-in' : 'Ready for Walk-in Scan'}</strong>
            </div>

            {/* Quick Simulation Trigger */}
            <div className="kiosk-sim-box">
              <span className="kiosk-sim-title">
                <GaugeRegular /> Test Terminal Simulation
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                Simulate a driver plug-in and instant session start for {activeConnector?.physicalReference || activeConnector?.standard}.
              </p>
              <button className="btn-secondary btn-sm" onClick={handleSimulateArrival} disabled={isMaintenance} style={{ width: '100%', justifyContent: 'center' }}>
                <PlayRegular /> Simulate Driver Arrival &amp; Plug-in
              </button>
            </div>
          </section>

          {/* Right Column: Charging Bay Telemetry & Controls */}
          <section className="kiosk-right glass">
            <div className="kiosk-panel-header">
              <div className="kiosk-step-pill">
                <GaugeRegular /> Step 2: Bay Telemetry &amp; Charging
              </div>
              <h2>{activeConnector?.physicalReference || 'Charging Bay #01'} — {activeConnector?.standard || 'CCS2'} ({activeConnector?.powerType || 'DC'} Fast {activeConnector?.maxPowerKw || 60}kW)</h2>
            </div>

            {/* Gauge Grid */}
            <div className="kiosk-gauges-grid">
              <div className="kiosk-gauge-card">
                <span className="kiosk-gauge-label">
                  <FlashRegular /> Active Power
                </span>
                <div className="kiosk-gauge-val" style={{ color: '#38bdf8' }}>
                  {simStreaming ? livePowerKw : 0} <small>kW</small>
                </div>
                <span className="kiosk-gauge-sub">{liveVoltage}V • {liveCurrent}A</span>
              </div>

              <div className="kiosk-gauge-card">
                <span className="kiosk-gauge-label">
                  <VehicleCarRegular /> Battery SoC
                </span>
                <div className="kiosk-gauge-val" style={{ color: '#10b981' }}>
                  {cablePlugged ? liveSoc : 0} <small>%</small>
                </div>
                <span className="kiosk-gauge-sub">{cablePlugged ? 'Vehicle Connected' : 'Cable Unplugged'}</span>
              </div>

              <div className="kiosk-gauge-card">
                <span className="kiosk-gauge-label">
                  <TimerRegular /> Energy Delivered
                </span>
                <div className="kiosk-gauge-val">
                  {energyKwh} <small>kWh</small>
                </div>
                <span className="kiosk-gauge-sub">Time: {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</span>
              </div>

              <div className="kiosk-gauge-card">
                <span className="kiosk-gauge-label">
                  <MoneyRegular /> Accrued Bill
                </span>
                <div className="kiosk-gauge-val" style={{ color: '#f59e0b' }}>
                  ₹{currentCost}
                </div>
                <span className="kiosk-gauge-sub">Rate: ₹{tariffRate}/kWh</span>
              </div>
            </div>

            {/* Battery Visual Progress Bar */}
            <div className="kiosk-battery-track">
              <div className="kiosk-battery-labels">
                <span>Vehicle State of Charge</span>
                <strong>{cablePlugged ? `${liveSoc}%` : '0%'}</strong>
              </div>
              <div className="kiosk-battery-bar">
                <div className="kiosk-battery-fill" style={{ width: `${cablePlugged ? liveSoc : 0}%` }} />
              </div>
            </div>

            {/* Hardware Action Buttons */}
            <div className="kiosk-hardware-controls">
              <button
                className={`btn-sm ${cablePlugged ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCablePlugged(!cablePlugged)}
                disabled={isMaintenance}
              >
                {cablePlugged ? <PlugConnectedFilled /> : <PlugDisconnectedRegular />}
                {cablePlugged ? 'Cable Connected' : 'Connect Charging Gun'}
              </button>

              {!simStreaming ? (
                <button className="btn-primary btn-sm" onClick={handleStartCharging} disabled={!cablePlugged || isMaintenance}>
                  <PlayFilled /> Start Fast Charging
                </button>
              ) : (
                <button className="btn-secondary btn-sm kiosk-btn--stop" onClick={handleStopCharging}>
                  <StopFilled /> Stop &amp; Settle Bill
                </button>
              )}

              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setSimStreaming(false);
                  setCumulativeEnergyWh(0);
                  setSessionSeconds(0);
                  setInvoice(null);
                }}
              >
                <ArrowSyncRegular /> Reset Bay
              </button>
            </div>

            {/* Digital Receipt Invoice Modal / Section */}
            <AnimatePresence>
              {invoice && (
                <motion.div
                  className="kiosk-invoice-card glass"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                >
                  <div className="kiosk-invoice-head">
                    <div className="kiosk-invoice-badge">
                      <CheckmarkCircleFilled /> Payment Settled
                    </div>
                    <strong>{invoice.invoiceId}</strong>
                  </div>

                  <div className="kiosk-invoice-details">
                    <div>
                      <span>Driver:</span> <strong>{invoice.driverName}</strong>
                    </div>
                    <div>
                      <span>Energy Consumed:</span> <strong>{invoice.energyDeliveredKwh} kWh</strong>
                    </div>
                    <div>
                      <span>Duration:</span> <strong>{invoice.chargingDurationMins} minutes</strong>
                    </div>
                    <div>
                      <span>Base Amount:</span> <strong>₹{invoice.baseAmount}</strong>
                    </div>
                    <div>
                      <span>GST (18%):</span> <strong>₹{invoice.gst18}</strong>
                    </div>
                    <div className="kiosk-invoice-total">
                      <span>Total Debited:</span> <strong>₹{invoice.totalPaid}</strong>
                    </div>
                  </div>

                  <div className="kiosk-invoice-foot">
                    <span>Method: {invoice.paymentMethod || 'UPI / UEI Direct Debit'}</span>
                    <button className="btn-primary btn-xs" onClick={() => window.print()}>
                      <ReceiptRegular /> Print Receipt
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
