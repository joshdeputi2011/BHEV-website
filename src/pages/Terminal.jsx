import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FlashRegular,
  PlayRegular,
  ArrowResetRegular,
  PlugConnectedRegular,
  CheckmarkCircleRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons';
import QRCode from 'qrcode';
import GlowBlob from '../components/GlowBlob';
import './Terminal.css';

export default function Terminal() {
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, GUN_CONNECTED, CHARGING, COMPLETED
  const [activePower, setActivePower] = useState(0);
  const [voltage, setVoltage] = useState(402);
  const [current, setCurrent] = useState(145);
  const [soc, setSoc] = useState(0);
  const [energyDelivered, setEnergyDelivered] = useState(5.40);
  const [ratePerKwh] = useState(14.50);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const canvasRef = useRef(null);

  // QR Code Payload
  const qrPayload = JSON.stringify({
    protocol: 'UEI-1.0',
    stationId: 'BHEV-DEL-01',
    bayId: 'BAY-01-CCS2',
    operator: 'BHEV / CHARGEGRID',
    standard: 'CCS2',
    ratePerKwh: 14.50,
    timestamp: Date.now(),
  });

  // Render QR Code to Canvas with High Contrast & Fallback
  useEffect(() => {
    if (canvasRef.current) {
      try {
        QRCode.toCanvas(
          canvasRef.current,
          qrPayload,
          {
            width: 220,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          },
          (error) => {
            if (error) console.error('QR Render Error:', error);
          }
        );
      } catch (err) {
        console.warn('QRCode canvas generation failed:', err);
      }
    }
  }, [qrPayload]);

  // Charging Telemetry Simulation Timer
  useEffect(() => {
    let interval = null;
    if (sessionState === 'CHARGING') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        setActivePower(58.4 + (Math.random() * 2.4 - 1.2));
        setEnergyDelivered((prev) => Number((prev + 0.016).toFixed(2)));
        setSoc((prev) => (prev < 100 ? prev + 1 : 100));
      }, 1000);
    } else {
      if (sessionState === 'IDLE') {
        setActivePower(0);
      }
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  const handleSimulateArrival = () => {
    setSessionState('GUN_CONNECTED');
    setSoc(35);
  };

  const handleConnectGun = () => {
    setSessionState('GUN_CONNECTED');
    setSoc(35);
  };

  const handleStartCharging = () => {
    setSessionState('CHARGING');
  };

  const handleReset = () => {
    setSessionState('IDLE');
    setActivePower(0);
    setSoc(0);
    setEnergyDelivered(5.40);
    setElapsedSeconds(0);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const accruedBill = (energyDelivered * ratePerKwh).toFixed(2);

  return (
    <div className="terminal-page">
      <GlowBlob color="green" size={240} top="-50px" left="-50px" />
      <GlowBlob color="blue" size={280} bottom="-50px" right="-50px" delay={2} />

      <div className="container terminal-container">
        <div className="terminal-grid">
          {/* ── STEP 1: SCAN & AUTHORIZE ── */}
          <div className="terminal-card terminal-card--step1 glass">
            <div className="terminal-badge">
              <FlashRegular />
              <span>STEP 1: SCAN & AUTHORIZE</span>
            </div>

            <h2 className="terminal-title">Universal Driver Check-in</h2>
            <p className="terminal-subtitle">
              Scan with BHEV mobile app or any UEI interoperable EV wallet.
            </p>

            {/* QR Code Container with High-Visibility Canvas */}
            <div className="terminal-qr-box">
              <div className="terminal-qr-frame">
                <canvas ref={canvasRef} className="terminal-qr-canvas" width="220" height="220" />
              </div>
            </div>

            <div className="terminal-status-indicator">
              <span className="status-dot status-dot--ready"></span>
              <span className="status-text">
                {sessionState === 'IDLE' ? 'Ready for Walk-in Scan' : 'Driver Connected'}
              </span>
            </div>

            {/* Test Terminal Simulation Section */}
            <div className="terminal-test-simulation">
              <div className="simulation-header">
                <span className="simulation-icon">⏱</span>
                <h4>TEST TERMINAL SIMULATION</h4>
              </div>
              <p>
                Simulate a driver plug-in and instant session start without scanning a physical phone.
              </p>
              <button
                className="btn-simulate"
                onClick={handleSimulateArrival}
                id="simulate-arrival-btn"
              >
                <PlayRegular /> Simulate Driver Arrival & Plug-in
              </button>
            </div>
          </div>

          {/* ── STEP 2: BAY TELEMETRY & CHARGING ── */}
          <div className="terminal-card terminal-card--step2 glass">
            <div className="terminal-badge">
              <FlashRegular />
              <span>STEP 2: BAY TELEMETRY & CHARGING</span>
            </div>

            <h2 className="terminal-title">Charging Bay #01 — CCS2 (DC Fast)</h2>

            {/* 4 Stat Cards in a Row */}
            <div className="telemetry-grid">
              {/* Card 1: Active Power */}
              <div className="telemetry-stat glass">
                <div className="stat-label">
                  <FlashRegular /> ACTIVE POWER
                </div>
                <div className="stat-value">
                  <span className="stat-number">{activePower.toFixed(0)}</span>
                  <span className="stat-unit">kW</span>
                </div>
                <div className="stat-subtext">{voltage}V • {current}A</div>
              </div>

              {/* Card 2: Battery SOC */}
              <div className="telemetry-stat glass">
                <div className="stat-label">
                  <PlugConnectedRegular /> BATTERY SOC
                </div>
                <div className="stat-value">
                  <span className="stat-number">{soc}</span>
                  <span className="stat-unit">%</span>
                </div>
                <div className="stat-subtext">
                  {sessionState === 'IDLE' ? 'Cable Unplugged' : sessionState === 'CHARGING' ? 'Charging active' : 'Cable Connected'}
                </div>
              </div>

              {/* Card 3: Energy Delivered */}
              <div className="telemetry-stat glass">
                <div className="stat-label">
                  <FlashRegular /> ENERGY DELIVERED
                </div>
                <div className="stat-value">
                  <span className="stat-number">{energyDelivered.toFixed(2)}</span>
                  <span className="stat-unit">kWh</span>
                </div>
                <div className="stat-subtext">Time: {formatTime(elapsedSeconds)}</div>
              </div>

              {/* Card 4: Accrued Bill */}
              <div className="telemetry-stat glass">
                <div className="stat-label">
                  <CheckmarkCircleRegular /> ACCRUED BILL
                </div>
                <div className="stat-value stat-value--bill">
                  <span className="stat-currency">₹</span>
                  <span className="stat-number">{accruedBill}</span>
                </div>
                <div className="stat-subtext">Rate: ₹{ratePerKwh.toFixed(1)}/kWh</div>
              </div>
            </div>

            {/* Vehicle State of Charge Bar */}
            <div className="soc-container">
              <div className="soc-header">
                <span>Vehicle State of Charge</span>
                <span className="soc-percentage">{soc}%</span>
              </div>
              <div className="soc-track">
                <motion.div
                  className="soc-fill"
                  style={{ width: `${soc}%` }}
                  animate={{ width: `${soc}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="terminal-actions">
              <button
                className={`btn-action btn-connect ${sessionState === 'GUN_CONNECTED' ? 'btn-action--active' : ''}`}
                onClick={handleConnectGun}
                id="connect-gun-btn"
              >
                <PlugConnectedRegular /> Connect Charging Gun
              </button>

              <button
                className={`btn-action btn-start-charge ${sessionState === 'CHARGING' ? 'btn-action--charging' : ''}`}
                onClick={handleStartCharging}
                disabled={sessionState === 'CHARGING'}
                id="start-charging-btn"
              >
                <PlayRegular /> {sessionState === 'CHARGING' ? 'Charging in Progress...' : 'Start Fast Charging'}
              </button>

              <button
                className="btn-action btn-reset"
                onClick={handleReset}
                id="reset-terminal-btn"
              >
                <ArrowResetRegular /> Reset Terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
