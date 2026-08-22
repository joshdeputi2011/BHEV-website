import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  QrCodeRegular,
  PlugConnectedRegular,
  FlashRegular,
  MoneyRegular,
  CalendarRegular,
  BatteryChargeRegular,
  VehicleCarRegular,
  PlayRegular,
  PauseRegular,
  ArrowResetRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import QRCode from 'qrcode';
import './ChargingPoint.css';

async function drawQR(canvas, text, size = 200) {
  if (!canvas || !text) return;
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0B0D0F',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to render QR code:', err);
  }
}

export default function ChargingPoint() {
  const { stationId } = useParams();
  const { token, apiFetch } = useAuth();
  const qrCanvasRef = useRef(null);

  const [station, setStation] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstConnector = station?.connectors?.[0];
  const maxPowerKw = Number(firstConnector?.maxPowerKw || 60);
  const tariffPerKwh = Number(firstConnector?.tariff?.pricePerKwh || 14.5);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [evConnected, setEvConnected] = useState(false);
  const [chargePercent, setChargePercent] = useState(0);
  const [energyKwh, setEnergyKwh] = useState(0);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [chargingStatus, setChargingStatus] = useState('IDLE'); // IDLE, CONNECTED, CHARGING, COMPLETE
  const simIntervalRef = useRef(null);

  // Load station info
  const loadStation = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/stations/${stationId}`);
      setStation(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stationId, apiFetch]);

  // Load dynamic QR
  const loadQr = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/v1/qr/${stationId}`);
      setQr(data.data);
    } catch {
      // Non-critical
    }
  }, [stationId, apiFetch]);

  useEffect(() => {
    loadStation();
  }, [loadStation]);

  useEffect(() => {
    loadQr();
    const timer = setInterval(loadQr, 30_000);
    return () => clearInterval(timer);
  }, [loadQr]);

  // Draw QR on canvas when token changes
  useEffect(() => {
    if (qr?.token && qrCanvasRef.current) {
      drawQR(qrCanvasRef.current, qr.token, 200);
    }
  }, [qr?.token]);

  // Charging simulation
  const startSimulation = () => {
    setSimulating(true);
    setEvConnected(true);
    setChargingStatus('CONNECTED');
    setChargePercent(0);
    setEnergyKwh(0);
    setElapsedMin(0);

    // Delay 2s then start charging
    setTimeout(() => {
      setChargingStatus('CHARGING');
      simIntervalRef.current = setInterval(() => {
        setElapsedMin((prev) => {
          const next = prev + 0.5;
          return next;
        });
        setChargePercent((prev) => {
          if (prev >= 100) {
            clearInterval(simIntervalRef.current);
            setChargingStatus('COMPLETE');
            setSimulating(false);
            return 100;
          }
          return Math.min(prev + 1.5 + Math.random(), 100);
        });
        setEnergyKwh((prev) => {
          const increment = (maxPowerKw / 120) * (0.8 + Math.random() * 0.4);
          return Math.round((prev + increment) * 100) / 100;
        });
      }, 500);
    }, 2000);
  };

  const stopSimulation = () => {
    clearInterval(simIntervalRef.current);
    setSimulating(false);
    setChargingStatus(chargePercent >= 100 ? 'COMPLETE' : 'IDLE');
  };

  const resetSimulation = () => {
    clearInterval(simIntervalRef.current);
    setSimulating(false);
    setEvConnected(false);
    setChargingStatus('IDLE');
    setChargePercent(0);
    setEnergyKwh(0);
    setElapsedMin(0);
  };

  useEffect(() => {
    return () => clearInterval(simIntervalRef.current);
  }, []);

  const cost = Math.round(energyKwh * tariffPerKwh * 100) / 100;

  if (loading) {
    return (
      <div className="charging-point__loading">
        <FlashRegular style={{ marginRight: 8 }} /> Loading station...
      </div>
    );
  }

  if (error) {
    return (
      <div className="charging-point__loading">
        ❌ {error}
      </div>
    );
  }

  return (
    <div className="charging-point container-wide">
      <GlowBlob color="green" size={180} top="-60px" left="-60px" />
      <GlowBlob color="blue" size={220} bottom="-80px" right="-80px" delay={2} />

      <header className="charging-point__header">
        <span className="charging-point__eyebrow">
          <PlugConnectedRegular /> Charging Point Test Endpoint
        </span>
        <h1 className="charging-point__title">{station?.name || 'Station'}</h1>
        <p className="charging-point__station-name">
          {station?.address}, {station?.city} · {station?.connectors?.[0]?.standard} · {station?.connectors?.[0]?.maxPowerKw} kW
        </p>
      </header>

      <div className="charging-point__grid">
        {/* Left: QR Panel */}
        <motion.div
          className="charging-point__qr-panel glass"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="charging-point__qr-label">
            <QrCodeRegular /> Dynamic QR Code
          </span>

          <div className="charging-point__qr-container">
            <canvas ref={qrCanvasRef} width={200} height={200} />
          </div>

          <div className="charging-point__qr-timer">
            <span className="charging-point__qr-timer-dot" />
            Expires {qr ? new Date(qr.expiresAt).toLocaleTimeString() : '—'}
          </div>

          <p className="charging-point__qr-token">
            {qr?.token || 'Generating signed token...'}
          </p>

          {/* Simulation Controls */}
          <div className="charging-point__sim-controls">
            {!simulating && chargingStatus !== 'CHARGING' && (
              <button className="btn-primary btn-sm" onClick={startSimulation} id="sim-start">
                <PlayRegular /> Simulate Charge
              </button>
            )}
            {simulating && (
              <button className="btn-secondary btn-sm" onClick={stopSimulation} id="sim-stop">
                <PauseRegular /> Stop
              </button>
            )}
            {(evConnected || chargePercent > 0) && (
              <button className="btn-secondary btn-sm" onClick={resetSimulation} id="sim-reset">
                <ArrowResetRegular /> Reset
              </button>
            )}
          </div>
        </motion.div>

        {/* Right: Status Panels */}
        <div className="charging-point__panels">
          {/* Slot Confirmation */}
          <motion.div
            className="charging-point__panel glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="charging-point__panel-title">
              <CalendarRegular /> Slot Information
            </h3>
            <div className="charging-point__slot-grid">
              <div className="charging-point__slot-item">
                <span className="charging-point__slot-label">Station ID</span>
                <span className="charging-point__slot-value">{stationId?.slice(0, 8)}...</span>
              </div>
              <div className="charging-point__slot-item">
                <span className="charging-point__slot-label">Connector</span>
                <span className="charging-point__slot-value">{station?.connectors?.[0]?.standard || '—'}</span>
              </div>
              <div className="charging-point__slot-item">
                <span className="charging-point__slot-label">Power</span>
                <span className="charging-point__slot-value">{station?.connectors?.[0]?.maxPowerKw || MAX_POWER_KW} kW</span>
              </div>
              <div className="charging-point__slot-item">
                <span className="charging-point__slot-label">Status</span>
                <span className="charging-point__slot-value" style={{
                  color: chargingStatus === 'CHARGING' ? 'var(--accent)' : chargingStatus === 'COMPLETE' ? 'var(--accent-blue)' : 'var(--text-tertiary)'
                }}>
                  {chargingStatus}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Connected EV */}
          <motion.div
            className="charging-point__panel glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="charging-point__panel-title">
              <VehicleCarRegular /> Connected EV
            </h3>
            <div className="charging-point__ev-status">
              <div className={`charging-point__ev-indicator ${evConnected ? 'charging-point__ev-indicator--connected' : 'charging-point__ev-indicator--disconnected'}`}>
                <PlugConnectedRegular />
              </div>
              <div className="charging-point__ev-info">
                <h4>{evConnected ? 'Vehicle Connected' : 'No Vehicle Detected'}</h4>
                <p>{evConnected ? 'EV is plugged in and ready for charging' : 'Waiting for vehicle connection...'}</p>
              </div>
            </div>
          </motion.div>

          {/* Charge Status */}
          <motion.div
            className="charging-point__panel glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="charging-point__panel-title">
              <BatteryChargeRegular /> Charge Progress
            </h3>
            <div className="charging-point__progress-bar">
              <div
                className="charging-point__progress-fill"
                style={{ width: `${chargePercent}%` }}
              />
            </div>
            <div className="charging-point__progress-stats">
              <div>
                <div className="charging-point__stat-value charging-point__stat-value--accent">
                  {Math.round(chargePercent)}%
                </div>
                <div className="charging-point__stat-label">Charged</div>
              </div>
              <div>
                <div className="charging-point__stat-value">{energyKwh.toFixed(1)}</div>
                <div className="charging-point__stat-label">kWh Delivered</div>
              </div>
              <div>
                <div className="charging-point__stat-value">{elapsedMin.toFixed(1)}</div>
                <div className="charging-point__stat-label">Minutes</div>
              </div>
            </div>
          </motion.div>

          {/* Cost */}
          <motion.div
            className="charging-point__panel glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="charging-point__panel-title">
              <MoneyRegular /> Cost
            </h3>
            <div className="charging-point__cost-display">
              <span className="charging-point__cost-amount">₹{cost.toFixed(2)}</span>
              <span className="charging-point__cost-currency">INR</span>
            </div>
            <div className="charging-point__cost-breakdown">
              <div className="charging-point__cost-row">
                <span>Tariff</span>
                <span>₹{TARIFF_PER_KWH}/kWh</span>
              </div>
              <div className="charging-point__cost-row">
                <span>Energy consumed</span>
                <span>{energyKwh.toFixed(2)} kWh</span>
              </div>
              <div className="charging-point__cost-row">
                <span>Duration</span>
                <span>{elapsedMin.toFixed(1)} min</span>
              </div>
              <div className="charging-point__cost-row" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span>₹{cost.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
