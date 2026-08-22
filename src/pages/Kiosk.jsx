import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import './Kiosk.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

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
  const [stationList, setStationList] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(routeStationId || null);
  const [kioskState, setKioskState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const qrCanvasRef = useRef(null);

  // Hardware Simulation State
  const [cablePlugged, setCablePlugged] = useState(false);
  const [simStreaming, setSimStreaming] = useState(false);
  const [livePowerKw, setLivePowerKw] = useState(58.4);
  const [liveVoltage, setLiveVoltage] = useState(402);
  const [liveCurrent, setLiveCurrent] = useState(145);
  const [liveSoc, setLiveSoc] = useState(38);
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
        const fallback = [
          { id: 'st-001', name: 'Koramangala HyperCharge DC Hub', city: 'Bengaluru', maxPowerKw: 60 },
          { id: 'st-002', name: 'Indiranagar 100ft Fast Hub', city: 'Bengaluru', maxPowerKw: 50 },
          { id: 'st-003', name: 'Whitefield Tech Corridor Hub', city: 'Bengaluru', maxPowerKw: 120 }
        ];
        setStationList(fallback);
        if (!selectedStationId) setSelectedStationId(fallback[0].id);
      });
  }, [selectedStationId]);

  // Fetch Kiosk State from backend
  const fetchState = useCallback(async () => {
    if (!selectedStationId) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/state`);
      const data = await res.json();
      if (res.ok && data.data) {
        setKioskState(data.data);
        if (data.data.activeSession) {
          setCablePlugged(true);
          setSimStreaming(true);
          setLiveSoc(data.data.activeSession.socPercent || 48);
          setCumulativeEnergyWh(data.data.activeSession.energyWh || 6000);
        }
      } else {
        const matched = stationList.find((s) => s.id === selectedStationId);
        setKioskState({
          station: {
            id: selectedStationId,
            name: matched?.name || 'Koramangala HyperCharge DC Hub',
            address: matched?.address || '80 Feet Road, 4th Block, Koramangala',
            city: matched?.city || 'Bengaluru',
            status: 'ACTIVE'
          },
          connector: {
            id: 'conn-kiosk',
            standard: 'CCS2',
            powerType: 'DC',
            maxPowerKw: matched?.maxPowerKw || 60,
            status: 'AVAILABLE'
          },
          tariff: {
            pricePerKwh: 14.5,
            flatFee: 20.0
          },
          qr: {
            token: `UEI-KIOSK-${selectedStationId.slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`,
            expiresAt: new Date(Date.now() + 30000).toISOString()
          },
          activeSession: null
        });
      }
    } catch (err) {
      console.warn('Kiosk state fetch fallback:', err);
      const matched = stationList.find((s) => s.id === selectedStationId);
      setKioskState({
        station: {
          id: selectedStationId,
          name: matched?.name || 'Koramangala HyperCharge DC Hub',
          address: matched?.address || '80 Feet Road, 4th Block, Koramangala',
          city: matched?.city || 'Bengaluru',
          status: 'ACTIVE'
        },
        connector: {
          id: 'conn-kiosk',
          standard: 'CCS2',
          powerType: 'DC',
          maxPowerKw: matched?.maxPowerKw || 60,
          status: 'AVAILABLE'
        },
        tariff: {
          pricePerKwh: 14.5,
          flatFee: 20.0
        },
        qr: {
          token: `UEI-KIOSK-${(selectedStationId || 'stn-01').slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`,
          expiresAt: new Date(Date.now() + 30000).toISOString()
        },
        activeSession: null
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStationId, stationList]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Draw QR and generate Data URL
  useEffect(() => {
    const token = kioskState?.qr?.token || `UEI-KIOSK-${(selectedStationId || 'st-001').slice(0, 8)}-${Math.floor(Date.now() / 30000) * 30}.HMAC_SIG`;
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
  }, [kioskState?.qr?.token, selectedStationId]);

  // Telemetry stream interval
  useEffect(() => {
    let timer;
    if (simStreaming && cablePlugged) {
      timer = setInterval(() => {
        setSessionSeconds((s) => s + 2);
        setLivePowerKw((p) => Number((58 + (Math.random() * 4 - 2)).toFixed(1)));
        setLiveVoltage((v) => Math.round(400 + (Math.random() * 6 - 3)));
        setLiveCurrent((c) => Math.round(145 + (Math.random() * 6 - 3)));
        setLiveSoc((soc) => Math.min(100, Number((soc + 0.25).toFixed(1))));
        setCumulativeEnergyWh((wh) => wh + 32);

        fetch(`${API_URL}/api/v1/kiosk/${selectedStationId}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
  }, [simStreaming, cablePlugged, livePowerKw, liveVoltage, liveCurrent, liveSoc, cumulativeEnergyWh, selectedStationId]);

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
        body: JSON.stringify({ driverName: 'Walk-in EV Driver', initialSoc: liveSoc })
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
  const visualState = kioskState?.visualState || (isCharging ? 'CHARGING' : 'FREE');
  const kioskTone = String(kioskState?.kioskColor || (isCharging ? 'ORANGE' : 'GREEN')).toLowerCase();
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
              onChange={(e) => setSelectedStationId(e.target.value)}
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
        {/* Left Column: Interactive QR Check-in Terminal */}
        <section className="kiosk-left glass">
          <div className="kiosk-panel-header">
            <div className="kiosk-step-pill">
              <QrCodeRegular /> Step 1: Scan &amp; Authorize
            </div>
            <h2>Universal Driver Check-in</h2>
            <p>Scan with BHEV mobile app or any UEI interoperable EV wallet.</p>
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
              <img src={qrDataUrl} alt="Kiosk Check-in QR" className="kiosk-qr-img" width={200} height={200} />
            ) : (
              <canvas ref={qrCanvasRef} width={200} height={200} />
            )}
          </div>

          <div className="kiosk-qr-status">
            <span className={`kiosk-status-dot ${isCharging ? 'kiosk-status-dot--charging' : 'kiosk-status-dot--ready'}`} />
            <strong>{isCharging ? 'Charging in Progress' : visualState === 'BOOKED' ? 'Booked Driver Check-in' : 'Ready for Walk-in Scan'}</strong>
          </div>

          {/* Quick Simulation Trigger */}
          <div className="kiosk-sim-box">
            <span className="kiosk-sim-title">
              <GaugeRegular /> Test Terminal Simulation
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
              Simulate a driver plug-in and instant session start without scanning a physical phone.
            </p>
            <button className="btn-secondary btn-sm" onClick={handleSimulateArrival} style={{ width: '100%', justifyContent: 'center' }}>
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
            <h2>Charging Bay #01 — {kioskState?.connector?.standard || 'CCS2'} (DC Fast)</h2>
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
            >
              {cablePlugged ? <PlugConnectedFilled /> : <PlugDisconnectedRegular />}
              {cablePlugged ? 'Cable Connected' : 'Connect Charging Gun'}
            </button>

            {!simStreaming ? (
              <button className="btn-primary btn-sm" onClick={handleStartCharging} disabled={!cablePlugged}>
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
              <ArrowSyncRegular /> Reset Terminal
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
                  <span>Method: {invoice.paymentMethod}</span>
                  <button className="btn-primary btn-xs" onClick={() => window.print()}>
                    <ReceiptRegular /> Print Receipt
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
