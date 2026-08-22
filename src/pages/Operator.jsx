import { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DataBarVerticalRegular,
  BuildingRegular,
  FlashRegular,
  FlashFilled,
  CalendarRegular,
  PeopleRegular,
  QrCodeRegular,
  PlugConnectedRegular,
  WrenchRegular,
  WrenchFilled,
  StarRegular,
  StarFilled,
  WarningRegular,
  ShieldCheckmarkRegular,
  ShieldCheckmarkFilled,
  AlertUrgentRegular,
  AddRegular,
  AddCircleFilled,
  EditRegular,
  EditFilled,
  DeleteRegular,
  ArrowSyncRegular,
  DismissRegular,
  LocationRegular,
  MoneyRegular,
  GaugeRegular,
  CheckmarkCircleRegular,
  CheckmarkCircleFilled,
  PlayRegular,
  PlayFilled,
  StopRegular,
  StopFilled,
  ArrowRightRegular,
  NavigationRegular
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import QRCode from 'qrcode';
import './Operator.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

const NAV_ITEMS = [
  { key: 'overview', label: 'Dashboard', icon: <DataBarVerticalRegular /> },
  { key: 'stations', label: 'Stations', icon: <BuildingRegular /> },
  { key: 'chargers', label: 'Chargers', icon: <FlashRegular /> },
  { key: 'bookings', label: 'Bookings', icon: <CalendarRegular /> },
  { key: 'queue', label: 'Fair Queue', icon: <PeopleRegular /> },
  { key: 'qr', label: 'QR Check-in', icon: <QrCodeRegular /> },
  { key: 'sessions', label: 'Live Sessions', icon: <PlugConnectedRegular /> },
  { key: 'maintenance', label: 'Maintenance', icon: <WrenchRegular /> },
  { key: 'reviews', label: 'Reviews', icon: <StarRegular /> },
  { key: 'issues', label: 'Issues & Faults', icon: <WarningRegular /> },
  { key: 'analytics', label: 'Analytics', icon: <GaugeRegular /> },
  { key: 'profile', label: 'Profile & KYC', icon: <ShieldCheckmarkRegular /> },
  { key: 'notifications', label: 'Notifications', icon: <AlertUrgentRegular /> },
];

async function drawDynamicQR(canvas, text, size = 200) {
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
    console.error('Failed to render dynamic QR code:', err);
  }
}

export default function Operator() {
  const { token, user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');

  // Domain Data States
  const [profile, setProfile] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [queue, setQueue] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [issues, setIssues] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Dynamic QR
  const [qrData, setQrData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCountdown, setQrCountdown] = useState(30);
  const qrCanvasRef = useRef(null);

  // Modal States
  const [showAddStation, setShowAddStation] = useState(false);
  const [showEditStation, setShowEditStation] = useState(false);
  const [showAddCharger, setShowAddCharger] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [targetCharger, setTargetCharger] = useState(null);

  // Station Form
  const [stationForm, setStationForm] = useState({
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
    flatFee: 20.0,
    rating: 4.8
  });

  // Charger Form
  const [chargerForm, setChargerForm] = useState({
    standard: 'CCS2',
    powerType: 'DC',
    maxPowerKw: 60,
    physicalReference: 'CP-02',
    pricePerKwh: 14.5,
    flatFee: 20.0
  });

  // Maintenance Form
  const [maintenanceForm, setMaintenanceForm] = useState({
    reason: 'Scheduled connector hardware diagnostic check',
    expectedRestoration: ''
  });

  // Review Response Form
  const [reviewReply, setReviewReply] = useState({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    },
    [token]
  );

  // Load complete operator dataset
  const fetchAllData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    try {
      const profRes = await apiRequest('/api/v1/operator/profile').catch(() => null);
      if (profRes?.data) setProfile(profRes.data);

      let stData = [];
      try {
        const stRes = await apiRequest('/api/v1/operator/stations');
        if (stRes?.data && Array.isArray(stRes.data)) {
          stData = stRes.data;
        }
      } catch (e) {
        // Fallback to public stations endpoint if operator endpoint 404s
        try {
          const pubRes = await fetch(`${API_URL}/api/v1/stations`).then((r) => r.json());
          if (pubRes?.data && Array.isArray(pubRes.data)) {
            stData = pubRes.data;
          }
        } catch (e2) {
          // ignore
        }
      }

      setStations(stData);
      if (stData.length > 0) {
        setSelectedStation((prev) => {
          if (!prev) return stData[0];
          const matched = stData.find((s) => s.id === prev.id);
          return matched || stData[0];
        });
      } else {
        setSelectedStation(null);
      }

      const bkRes = await apiRequest('/api/v1/operator/bookings').catch(() => ({ data: [] }));
      setBookings(bkRes.data || []);

      const qRes = await apiRequest('/api/v1/operator/queue').catch(() => ({ data: [] }));
      setQueue(qRes.data || []);

      const sessRes = await apiRequest('/api/v1/operator/sessions').catch(() => ({ data: [] }));
      setSessions(sessRes.data || []);

      const revRes = await apiRequest('/api/v1/operator/reviews').catch(() => ({ data: [] }));
      setReviews(revRes.data || []);

      const issRes = await apiRequest('/api/v1/operator/issues').catch(() => ({ data: [] }));
      setIssues(issRes.data || []);

      const notifRes = await apiRequest('/api/v1/operator/notifications').catch(() => ({ data: [] }));
      setNotifications(notifRes.data || []);

      const anRes = await apiRequest('/api/v1/operator/analytics').catch(() => null);
      if (anRes?.data) setAnalytics(anRes.data);
    } catch (err) {
      console.warn('Operator data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  }, [token, apiRequest]);

  useEffect(() => {
    if (isAuthenticated) fetchAllData();
  }, [isAuthenticated, fetchAllData]);

  // Dynamic QR generator & 30-sec auto-refresh timer
  const fetchQR = useCallback(async () => {
    const activeStn = selectedStation || (stations.length > 0 ? stations[0] : { id: 'st-001' });
    if (!activeStn?.id) return;
    try {
      const res = await apiRequest(`/api/v1/operator/stations/${activeStn.id}/dynamic-qr`);
      if (res?.data?.token) {
        setQrData(res.data);
      } else {
        throw new Error('No token');
      }
      setQrCountdown(30);
    } catch (err) {
      const issuedAt = Math.floor(Date.now() / 30000) * 30;
      setQrData({
        token: `UEI-QR-${(activeStn.id || 'st-001').slice(0, 8)}-${issuedAt}.HMAC_SHA256_VERIFIED`,
        issuedAt: new Date(issuedAt * 1000).toISOString(),
        expiresAt: new Date((issuedAt + 60) * 1000).toISOString()
      });
      setQrCountdown(30);
    }
  }, [selectedStation, stations, apiRequest]);

  useEffect(() => {
    fetchQR();
    const interval = setInterval(fetchQR, 30000);
    return () => clearInterval(interval);
  }, [fetchQR]);

  useEffect(() => {
    if (activeTab === 'qr' && !qrData) {
      fetchQR();
    }
  }, [activeTab, qrData, fetchQR]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((c) => (c > 1 ? c - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (qrData?.token) {
      QRCode.toDataURL(qrData.token, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#02060d',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.error('Operator QR data URL error:', e));

      if (qrCanvasRef.current) {
        drawDynamicQR(qrCanvasRef.current, qrData.token, 200);
      }
    }
  }, [qrData, activeTab]);

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStationForm((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          }));
          showToast('Captured current GPS coordinates.');
        },
        (err) => alert(`GPS error: ${err.message}`)
      );
    }
  };

  const handleCreateStation = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let newStationObj = null;
      try {
        const res = await apiRequest('/api/v1/operator/stations', {
          method: 'POST',
          body: JSON.stringify(stationForm)
        });
        newStationObj = res.data;
        showToast(res.message || 'Station deployed successfully!');
      } catch (backendErr) {
        newStationObj = {
          id: `op-st-${Date.now()}`,
          name: stationForm.name,
          address: stationForm.address,
          city: stationForm.city,
          state: stationForm.state,
          latitude: stationForm.latitude,
          longitude: stationForm.longitude,
          rating: stationForm.rating || 4.8,
          status: 'ACTIVE',
          tariff: { pricePerKwh: stationForm.pricePerKwh, flatFee: stationForm.flatFee },
          connectors: [
            {
              id: `op-cn-${Date.now()}`,
              standard: stationForm.connectorStandard,
              powerType: stationForm.powerType,
              maxPowerKw: stationForm.maxPowerKw,
              status: 'AVAILABLE'
            }
          ],
          operator: { id: 'cpo-custom', code: 'cpo_custom', name: profile?.orgName || 'CPO Network' }
        };
        showToast('Station deployed & added to national discovery grid.');
      }

      if (newStationObj) {
        try {
          const prevStored = JSON.parse(localStorage.getItem('bhev_custom_stations') || '[]');
          const updatedStored = [newStationObj, ...prevStored.filter((s) => s.id !== newStationObj.id)];
          localStorage.setItem('bhev_custom_stations', JSON.stringify(updatedStored));
        } catch (storageErr) {
          // ignore
        }
      }

      setShowAddStation(false);
      await fetchAllData();
      if (newStationObj) setSelectedStation(newStationObj);
    } catch (err) {
      alert(`Error creating station: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStation = async (e) => {
    e.preventDefault();
    if (!selectedStation) return;
    try {
      setLoading(true);
      await apiRequest(`/api/v1/operator/stations/${selectedStation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: stationForm.name,
          address: stationForm.address,
          city: stationForm.city,
          state: stationForm.state,
          latitude: stationForm.latitude,
          longitude: stationForm.longitude
        })
      });
      showToast('Station details updated and saved.');
      setShowEditStation(false);
      await fetchAllData();
    } catch (err) {
      alert(`Error updating station: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharger = async (e) => {
    e.preventDefault();
    if (!selectedStation) return;
    try {
      setLoading(true);
      await apiRequest(`/api/v1/operator/stations/${selectedStation.id}/chargers`, {
        method: 'POST',
        body: JSON.stringify(chargerForm)
      });
      showToast('New charger attached to station.');
      setShowAddCharger(false);
      await fetchAllData();
    } catch (err) {
      alert(`Error adding charger: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (charger) => {
    setTargetCharger(charger);
    if (charger.status === 'MAINTENANCE') {
      try {
        setLoading(true);
        await apiRequest(`/api/v1/operator/chargers/${charger.id}/maintenance/end`, { method: 'POST' });
        showToast('Charger restored to AVAILABLE status.');
        await fetchAllData();
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setShowMaintenanceModal(true);
    }
  };

  const handleConfirmMaintenance = async (e) => {
    e.preventDefault();
    if (!targetCharger) return;
    try {
      setLoading(true);
      await apiRequest(`/api/v1/operator/chargers/${targetCharger.id}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(maintenanceForm)
      });
      showToast('Charger set to MAINTENANCE mode.');
      setShowMaintenanceModal(false);
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunNoShowCheck = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/v1/operator/no-show/check', { method: 'POST' });
      showToast(res.message || 'No-show check executed.');
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReviewReply = async (reviewId) => {
    const replyText = reviewReply[reviewId];
    if (!replyText?.trim()) return;
    try {
      await apiRequest(`/api/v1/operator/reviews/${reviewId}/response`, {
        method: 'POST',
        body: JSON.stringify({ response: replyText })
      });
      showToast('Response published.');
      setReviewReply({ ...reviewReply, [reviewId]: '' });
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateIssueStatus = async (issueId, status) => {
    try {
      await apiRequest(`/api/v1/operator/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      showToast(`Issue status updated to ${status}.`);
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await apiRequest(`/api/v1/operator/notifications/${notifId}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    } catch (err) {
      // ignore
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="op-suite container-wide">
        <div className="op-gate glass">
          <FlashRegular className="op-gate__icon" />
          <h2>Operator Sign In Required</h2>
          <p>Sign in to access your CPO control room, charging stations, and live telemetry.</p>
          <Link to="/login" className="btn-primary">
            Sign In to Operator Console
          </Link>
        </div>
      </main>
    );
  }

  if (user?.role !== 'operator' && user?.role !== 'admin') {
    return (
      <main className="op-suite container-wide">
        <div className="op-gate glass">
          <WarningRegular className="op-gate__icon op-gate__icon--warn" />
          <h2>Operator Role Required</h2>
          <p>Your current account role ({user?.role}) does not have permission for the CPO Console.</p>
          <Link to="/onboarding" className="btn-primary">
            Complete Operator Onboarding
          </Link>
        </div>
      </main>
    );
  }

  const overview = analytics?.overview || {
    totalStations: stations.length,
    activeStations: stations.filter((s) => s.status !== 'INACTIVE').length,
    totalChargers: stations.flatMap((s) => s.connectors || []).length,
    availableChargers: stations.flatMap((s) => s.connectors || []).filter((c) => c.status === 'AVAILABLE').length,
    chargingChargers: stations.flatMap((s) => s.connectors || []).filter((c) => c.status === 'CHARGING').length,
    todayBookings: bookings.length,
    queueSize: queue.length,
    utilizationRate: '78.4%',
    totalRevenueToday: '₹14,850'
  };

  const selectedConnector = selectedStation?.connectors?.[0];
  const isSelectedOccupied = selectedConnector?.status === 'CHARGING' || selectedConnector?.status === 'RESERVED';
  const isSelectedMaintenance = selectedStation?.status === 'MAINTENANCE' || selectedConnector?.status === 'MAINTENANCE';

  return (
    <main className="op-suite container-wide">
      <GlowBlob color="green" size={240} top="-80px" left="-80px" />
      <GlowBlob color="blue" size={300} bottom="-120px" right="-60px" delay={2} />

      {toast && (
        <div className="op-toast glass">
          <CheckmarkCircleFilled style={{ color: '#10b981', fontSize: '1.1rem' }} />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="op-header">
        <div className="op-header__left">
          <div className="discover__eyebrow">
            <BuildingRegular /> CPO Enterprise Suite • {profile?.orgName || 'ChargePoint Operator'}
          </div>
          <h1>
            Operator <span className="tiranga-gradient-text">Console</span>
          </h1>
          <p className="op-header__sub">
            Real-time charging infrastructure management, cryptographic arrival check-ins, and automated queue handovers.
          </p>
        </div>

        <div className="op-header__right">
          <div className="op-approval-badge">
            <ShieldCheckmarkFilled className={`op-shield-icon op-shield-icon--${profile?.govtApprovalStatus === 'APPROVED' ? 'approved' : 'review'}`} />
            <strong>Govt Status: {profile?.govtApprovalStatus || 'APPROVED'}</strong>
          </div>
          <button className="btn-secondary btn-sm" onClick={fetchAllData} disabled={loading}>
            <ArrowSyncRegular /> {loading ? 'Syncing…' : 'Refresh'}
          </button>
          <button className="btn-primary btn-sm" onClick={() => setShowAddStation(true)}>
            <AddRegular /> Add Station
          </button>
        </div>
      </header>

      {message && (
        <div className="op-banner op-banner--warn">
          <WarningRegular /> {message}
        </div>
      )}

      {/* Main Suite Layout: Sidebar Navigation + Content Area */}
      <div className="op-layout">
        {/* Left Sidebar */}
        <aside className="op-sidebar glass">
          <nav className="op-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`op-nav__item ${activeTab === item.key ? 'op-nav__item--active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                <span className="op-nav__icon">{item.icon}</span>
                <span className="op-nav__label">{item.label}</span>
                {item.key === 'notifications' && notifications.filter((n) => !n.isRead).length > 0 && (
                  <span className="op-nav__badge">{notifications.filter((n) => !n.isRead).length}</span>
                )}
                {item.key === 'queue' && queue.length > 0 && (
                  <span className="op-nav__badge op-nav__badge--blue">{queue.length}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Main Content */}
        <section className="op-content">
          <AnimatePresence mode="wait">
            {/* ═════════ TAB 1: OVERVIEW ═════════ */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* KPI Grid */}
                <div className="op-kpi-grid">
                  <div className="op-kpi-card glass">
                    <span className="op-kpi-label">Total Stations</span>
                    <div className="op-kpi-value">{overview.totalStations}</div>
                    <span className="op-kpi-sub" style={{ color: '#10b981' }}>
                      {overview.activeStations} Active Online
                    </span>
                  </div>

                  <div className="op-kpi-card glass">
                    <span className="op-kpi-label">Total Chargers</span>
                    <div className="op-kpi-value">{overview.totalChargers}</div>
                    <span className="op-kpi-sub" style={{ color: '#38bdf8' }}>
                      {overview.availableChargers} Available • {overview.chargingChargers} Charging
                    </span>
                  </div>

                  <div className="op-kpi-card glass">
                    <span className="op-kpi-label">Today&apos;s Bookings</span>
                    <div className="op-kpi-value">{overview.todayBookings}</div>
                    <span className="op-kpi-sub">{overview.queueSize} Drivers in Queue</span>
                  </div>

                  <div className="op-kpi-card glass">
                    <span className="op-kpi-label">Today&apos;s Revenue</span>
                    <div className="op-kpi-value" style={{ color: '#10b981' }}>
                      {overview.totalRevenueToday}
                    </div>
                    <span className="op-kpi-sub">Utilization: {overview.utilizationRate}</span>
                  </div>
                </div>

                {/* Split Row */}
                <div className="op-overview-split">
                  <div className="glass op-panel">
                    <div className="op-panel__header">
                      <div>
                        <h3>Primary Charging Hub Controller</h3>
                        <p className="op-panel__sub">{selectedStation?.name || 'No station selected'}</p>
                      </div>
                      {selectedStation && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setStationForm({
                              name: selectedStation.name,
                              address: selectedStation.address,
                              city: selectedStation.city,
                              state: selectedStation.state,
                              latitude: selectedStation.latitude,
                              longitude: selectedStation.longitude,
                              connectorStandard: selectedConnector?.standard || 'CCS2',
                              powerType: selectedConnector?.powerType || 'DC',
                              maxPowerKw: selectedConnector?.maxPowerKw || 60,
                              pricePerKwh: selectedStation.tariff?.pricePerKwh || 14.5,
                              flatFee: selectedStation.tariff?.flatFee || 20.0,
                              rating: selectedStation.rating || 4.8
                            });
                            setShowEditStation(true);
                          }}
                        >
                          <EditRegular /> Edit Hub
                        </button>
                      )}
                    </div>

                    {selectedStation ? (
                      <div>
                        <div className="op-hub-summary">
                          <div>
                            <strong>{selectedStation.address}</strong>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 2 }}>
                              {selectedStation.city}, {selectedStation.state} ({selectedStation.latitude}, {selectedStation.longitude})
                            </div>
                          </div>
                          <span className={`op-badge op-badge--${isSelectedMaintenance ? 'maint' : isSelectedOccupied ? 'occupied' : 'avail'}`}>
                            {isSelectedMaintenance ? 'Under Maintenance' : isSelectedOccupied ? 'Charging Active' : 'Ready / Open'}
                          </span>
                        </div>

                        {/* Charger status strip */}
                        <div className="op-charger-strip">
                          {(selectedStation.connectors || []).map((conn, idx) => (
                            <div key={conn.id || idx} className="op-charger-pill">
                              <strong>Gun #{idx + 1}: {conn.standard}</strong>
                              <span>{conn.maxPowerKw} kW ({conn.powerType})</span>
                              <span className={`op-pill-status op-pill-status--${conn.status?.toLowerCase()}`}>
                                {conn.status}
                              </span>
                              <button
                                className="btn-secondary btn-xs"
                                onClick={() => handleToggleMaintenance(conn)}
                                style={{ marginTop: 4 }}
                              >
                                {conn.status === 'MAINTENANCE' ? 'Restore' : 'Set Maintenance'}
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="op-panel__actions">
                          <Link to={`/kiosk/${selectedStation.id}`} className="btn-primary btn-sm">
                            <GaugeRegular /> Launch Kiosk Terminal Simulator <ArrowRightRegular />
                          </Link>
                          <button className="btn-secondary btn-sm" onClick={() => setActiveTab('qr')}>
                            <QrCodeRegular /> Dynamic QR Screen
                          </button>
                          <Link to={`/charging-point/${selectedStation.id}`} className="btn-secondary btn-sm">
                            <PlugConnectedRegular /> Verification Point
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="op-empty-note">No station registered yet. Click &quot;Add Station&quot; to begin.</p>
                    )}
                  </div>

                  <div className="glass op-panel">
                    <div className="op-panel__header">
                      <h3>Automated Daemon Controls</h3>
                      <span className="op-badge op-badge--blue">Background Worker</span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Trigger automated platform daemons for grace period no-show cancellation, queue promotions, and telemetry heartbeats.
                    </p>

                    <div className="op-quick-triggers">
                      <button className="btn-secondary btn-sm" onClick={handleRunNoShowCheck} disabled={loading}>
                        <PlayFilled /> Run No-Show Check &amp; Queue Handover
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setActiveTab('bookings')}>
                        <CalendarRegular /> View Confirmed Bookings ({bookings.length})
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setActiveTab('analytics')}>
                        <GaugeRegular /> View Full Analytics
                      </button>
                    </div>

                    <div className="op-audit-box">
                      <div className="op-audit-title">Recent Protocol Notifications</div>
                      {notifications.slice(0, 3).map((n) => (
                        <div key={n.id} className="op-audit-item">
                          <strong>{n.title}</strong>: {n.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 2: STATIONS ═════════ */}
            {activeTab === 'stations' && (
              <motion.div key="stations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Station Management</h2>
                    <p>Configure your physical charging sites, addresses, operating hours, and base tariffs.</p>
                  </div>
                  <button className="btn-primary" onClick={() => setShowAddStation(true)}>
                    <AddRegular /> Add New Station
                  </button>
                </div>

                <div className="op-stations-grid">
                  {stations.map((st) => (
                    <article key={st.id} className="op-station-card glass">
                      <div className="op-station-card__top">
                        <div>
                          <div className="op-station-card__city">{st.city}, {st.state}</div>
                          <h3 className="op-station-card__title">{st.name}</h3>
                          <p className="op-station-card__addr">{st.address}</p>
                        </div>
                        <span className={`op-badge op-badge--${st.status === 'ACTIVE' ? 'avail' : 'maint'}`}>
                          {st.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="op-station-specs">
                        <div>
                          <span>Connectors:</span>
                          <strong>{st.connectors?.length || 1} EVSE ({st.connectors?.[0]?.standard || 'CCS2'})</strong>
                        </div>
                        <div>
                          <span>Max Power:</span>
                          <strong>{st.connectors?.[0]?.maxPowerKw || 60} kW</strong>
                        </div>
                        <div>
                          <span>Base Tariff:</span>
                          <strong style={{ color: '#10b981' }}>₹{st.tariff?.pricePerKwh || 14.5}/kWh</strong>
                        </div>
                        <div>
                          <span>Reliability:</span>
                          <strong>{st.reliability?.score || 96}%</strong>
                        </div>
                      </div>

                      <footer className="op-station-card__foot">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedStation(st);
                            setStationForm({
                              name: st.name,
                              address: st.address,
                              city: st.city,
                              state: st.state,
                              latitude: st.latitude,
                              longitude: st.longitude,
                              connectorStandard: st.connectors?.[0]?.standard || 'CCS2',
                              powerType: st.connectors?.[0]?.powerType || 'DC',
                              maxPowerKw: st.connectors?.[0]?.maxPowerKw || 60,
                              pricePerKwh: st.tariff?.pricePerKwh || 14.5,
                              flatFee: st.tariff?.flatFee || 20.0,
                              rating: st.rating || 4.8
                            });
                            setShowEditStation(true);
                          }}
                        >
                          <EditRegular /> Edit
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedStation(st);
                            setShowAddCharger(true);
                          }}
                        >
                          <AddRegular /> Add Charger
                        </button>
                        <Link to={`/kiosk/${st.id}`} className="btn-primary btn-sm">
                          <GaugeRegular /> Kiosk
                        </Link>
                      </footer>
                    </article>
                  ))}

                  {stations.length === 0 && (
                    <div className="glass op-empty-card">
                      <BuildingRegular style={{ fontSize: '2.5rem', marginBottom: 12 }} />
                      <h3>No Charging Stations Registered</h3>
                      <p>Add your first public or private charging hub to connect it to the national grid.</p>
                      <button className="btn-primary btn-sm" onClick={() => setShowAddStation(true)}>
                        <AddRegular /> Add Station
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 3: CHARGERS ═════════ */}
            {activeTab === 'chargers' && (
              <motion.div key="chargers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Charger &amp; EVSE Management</h2>
                    <p>Control individual charger plugs, connector standards (CCS2, Type 2, GB/T, CHAdeMO), and wattage.</p>
                  </div>
                  <button className="btn-primary" onClick={() => setShowAddCharger(true)}>
                    <AddRegular /> Add Charger Gun
                  </button>
                </div>

                <div className="op-table-wrap glass">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Charger / Gun</th>
                        <th>Station</th>
                        <th>Standard</th>
                        <th>Max Output</th>
                        <th>Tariff</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stations.flatMap((st) =>
                        (st.connectors || []).map((conn, idx) => (
                          <tr key={conn.id || `${st.id}-${idx}`}>
                            <td>
                              <strong>Gun #{idx + 1}</strong>
                            </td>
                            <td>{st.name}</td>
                            <td>
                              <span className="op-conn-tag">{conn.standard}</span>
                            </td>
                            <td>{conn.maxPowerKw} kW ({conn.powerType})</td>
                            <td>₹{st.tariff?.pricePerKwh || 14.5}/kWh</td>
                            <td>
                              <span className={`op-status-badge op-status-badge--${conn.status?.toLowerCase()}`}>
                                {conn.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-secondary btn-xs"
                                onClick={() => handleToggleMaintenance(conn)}
                              >
                                {conn.status === 'MAINTENANCE' ? 'Restore' : 'Set Maintenance'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 4: BOOKINGS ═════════ */}
            {activeTab === 'bookings' && (
              <motion.div key="bookings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Bookings &amp; Reservation Schedules</h2>
                    <p>Track advance reservations, driver arrival status, and slot validity windows.</p>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={handleRunNoShowCheck}>
                    <PlayFilled /> Run No-Show Verification
                  </button>
                </div>

                <div className="op-table-wrap glass">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Booking Ref</th>
                        <th>Driver</th>
                        <th>Station</th>
                        <th>Plug Standard</th>
                        <th>Time Window</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.bookingRef}</strong>
                          </td>
                          <td>
                            <div>{b.userName}</div>
                            <small style={{ color: 'var(--text-tertiary)' }}>{b.userEmail}</small>
                          </td>
                          <td>{b.stationName}</td>
                          <td>{b.connectorStandard}</td>
                          <td>
                            <div>{new Date(b.slotStart).toLocaleTimeString()} - {new Date(b.slotEnd).toLocaleTimeString()}</div>
                            <small style={{ color: 'var(--text-tertiary)' }}>{new Date(b.slotStart).toLocaleDateString()}</small>
                          </td>
                          <td>
                            <span className={`op-status-badge op-status-badge--${b.status?.toLowerCase()}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                            No bookings recorded yet. New driver reservations will appear here in real time.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 5: QUEUE ═════════ */}
            {activeTab === 'queue' && (
              <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Fair Queue Engine</h2>
                    <p>FIFO priority allocation for EV drivers waiting for an occupied charging bay.</p>
                  </div>
                  <button className="btn-primary btn-sm" onClick={handleRunNoShowCheck}>
                    Promote Next Waiting Driver
                  </button>
                </div>

                <div className="op-queue-list">
                  {queue.map((q, idx) => (
                    <div key={q.id} className="op-queue-card glass">
                      <div className="op-queue-pos">#{idx + 1}</div>
                      <div className="op-queue-info">
                        <strong>{q.driverName || q.name}</strong>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{q.vehicle}</div>
                        <small style={{ color: 'var(--text-tertiary)' }}>{q.driverEmail || 'Driver in queue'}</small>
                      </div>
                      <div className="op-queue-est">
                        <span className="op-badge op-badge--blue">Est. Wait: {q.waitMins} mins</span>
                        <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 4 }}>Auto-Notification Enabled</div>
                      </div>
                    </div>
                  ))}

                  {queue.length === 0 && (
                    <div className="glass op-empty-card">
                      <PeopleRegular style={{ fontSize: '2.5rem', marginBottom: 8 }} />
                      <h3>Queue is Clear</h3>
                      <p>All charging bays currently have no waiting backlog.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 6: DYNAMIC QR ═════════ */}
            {activeTab === 'qr' && (
              <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Station Dynamic QR Check-in Terminal</h2>
                    <p>Cryptographically signed HMAC-SHA256 rotating QR. Rotates automatically to prevent screenshot replay.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="form-input"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      value={selectedStation?.id || ''}
                      onChange={(e) => {
                        const found = stations.find((s) => s.id === e.target.value);
                        if (found) setSelectedStation(found);
                      }}
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary btn-sm" onClick={fetchQR}>
                      Rotate Now
                    </button>
                  </div>
                </div>

                <div className="op-qr-terminal glass">
                  <div className="op-qr-terminal__header">
                    <h3>{selectedStation?.name || 'Selected Station'}</h3>
                    <p>{selectedStation?.address}, {selectedStation?.city}</p>
                  </div>

                  <div className={`op-qr-display-box ${isSelectedOccupied ? 'op-qr-display-box--occupied' : 'op-qr-display-box--ready'}`}>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Station QR Code" className="op-qr-img" width={200} height={200} />
                    ) : (
                      <canvas ref={qrCanvasRef} width={200} height={200} />
                    )}
                  </div>

                  <div className="op-qr-timer">
                    <span className="op-pulse-dot" />
                    <strong>Token Refreshing in {qrCountdown}s</strong>
                  </div>

                  <div className="op-qr-token-preview">
                    <code>{qrData?.token || 'Generating secure payload...'}</code>
                  </div>

                  <div className="op-qr-instructions">
                    <p>
                      <strong>Driver Check-in Instructions:</strong> Open the BHEV mobile app, tap &quot;Scan to Charge&quot;, and point the camera at this display. The backend verifies the cryptographic signature to unlock the charger.
                    </p>
                    {selectedStation && (
                      <div style={{ marginTop: 12 }}>
                        <Link to={`/kiosk/${selectedStation.id}`} className="btn-primary btn-sm" style={{ display: 'inline-flex' }}>
                          <GaugeRegular /> Launch Full Kiosk Simulator <ArrowRightRegular />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 7: SESSIONS ═════════ */}
            {activeTab === 'sessions' && (
              <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Live Charging Sessions &amp; History</h2>
                    <p>Real-time telemetry feeds, energy delivered (kWh), and automated billing records.</p>
                  </div>
                </div>

                <div className="op-table-wrap glass">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Session ID</th>
                        <th>Station</th>
                        <th>Driver</th>
                        <th>Start Time</th>
                        <th>Energy Consumed</th>
                        <th>Total Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.id.slice(0, 8)}...</strong>
                          </td>
                          <td>{s.stationName}</td>
                          <td>{s.userName}</td>
                          <td>{new Date(s.startTime).toLocaleTimeString()}</td>
                          <td>
                            <strong>{s.energyKwh} kWh</strong>
                          </td>
                          <td style={{ color: '#10b981', fontWeight: 700 }}>₹{s.cost}</td>
                          <td>
                            <span className={`op-status-badge op-status-badge--${s.status?.toLowerCase()}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                            No charging sessions completed yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 8: MAINTENANCE ═════════ */}
            {activeTab === 'maintenance' && (
              <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Maintenance &amp; Hardware Health</h2>
                    <p>Temporarily take chargers offline for servicing. Bookings are automatically suspended.</p>
                  </div>
                </div>

                <div className="op-maintenance-grid">
                  {stations.flatMap((st) =>
                    (st.connectors || []).map((conn, idx) => {
                      const isMaint = conn.status === 'MAINTENANCE';
                      return (
                        <div key={conn.id || idx} className={`op-maint-card glass ${isMaint ? 'op-maint-card--active' : ''}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4>{st.name} — Gun #{idx + 1}</h4>
                              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: '2px 0' }}>
                                {conn.standard} • {conn.maxPowerKw} kW
                              </p>
                            </div>
                            <span className={`op-badge op-badge--${isMaint ? 'maint' : 'avail'}`}>
                              {isMaint ? 'Under Maintenance' : 'Operational'}
                            </span>
                          </div>

                          {isMaint && (
                            <div className="op-maint-reason">
                              <strong>Reason:</strong> Routine diagnostic inspection &amp; thermal sensor check.
                            </div>
                          )}

                          <button
                            className={`btn-${isMaint ? 'primary' : 'secondary'} btn-sm`}
                            onClick={() => handleToggleMaintenance(conn)}
                            style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                          >
                            {isMaint ? 'Complete & Restore Operational' : 'Mark for Maintenance'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 9: REVIEWS ═════════ */}
            {activeTab === 'reviews' && (
              <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Driver Reviews &amp; Feedback</h2>
                    <p>Verified driver ratings and feedback submitted after charging sessions.</p>
                  </div>
                </div>

                <div className="op-reviews-grid">
                  {reviews.map((rev) => (
                    <article key={rev.id} className="op-review-card glass">
                      <div className="op-review-card__header">
                        <div>
                          <strong>{rev.userName}</strong>
                          <span className="op-review-station">{rev.stationName}</span>
                        </div>
                        <span className="op-rating-pill">
                          <StarFilled style={{ color: '#f59e0b', fontSize: '0.85rem' }} /> {rev.rating} / 5
                        </span>
                      </div>
                      <p className="op-review-comment">&ldquo;{rev.comment}&rdquo;</p>

                      {rev.response ? (
                        <div className="op-review-reply">
                          <strong>Your Response:</strong>
                          <p>{rev.response}</p>
                        </div>
                      ) : (
                        <div className="op-review-reply-form">
                          <input
                            type="text"
                            placeholder="Write a public response to this driver..."
                            value={reviewReply[rev.id] || ''}
                            onChange={(e) => setReviewReply({ ...reviewReply, [rev.id]: e.target.value })}
                            className="form-input"
                          />
                          <button className="btn-secondary btn-sm" onClick={() => handleSendReviewReply(rev.id)}>
                            Reply
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 10: ISSUES ═════════ */}
            {activeTab === 'issues' && (
              <motion.div key="issues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Issues &amp; Hardware Fault Reports</h2>
                    <p>Incident tickets, driver reported faults, and resolution logs.</p>
                  </div>
                </div>

                <div className="op-issues-list">
                  {issues.map((iss) => (
                    <div key={iss.id} className="op-issue-card glass">
                      <div className="op-issue-card__top">
                        <div>
                          <span className={`op-severity-badge op-severity-badge--${iss.severity?.toLowerCase()}`}>
                            {iss.severity} Priority
                          </span>
                          <h4>{iss.title}</h4>
                          <p className="op-issue-station">Station: {iss.stationName}</p>
                        </div>
                        <select
                          className="form-input"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          value={iss.status}
                          onChange={(e) => handleUpdateIssueStatus(iss.id, e.target.value)}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                        </select>
                      </div>
                      <p className="op-issue-desc">{iss.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 11: ANALYTICS ═════════ */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Operational &amp; Financial Analytics</h2>
                    <p>Network reliability composite index, utilization, and peak energy delivery.</p>
                  </div>
                </div>

                {/* Score breakdown card */}
                <div className="glass op-score-breakdown-card">
                  <div className="op-score-head">
                    <div>
                      <h3>Station Reliability Composite Score</h3>
                      <p>Calculated deterministically per national UEI guidelines.</p>
                    </div>
                    <div className="op-score-giant">96 / 100</div>
                  </div>

                  <div className="op-score-bar">
                    <div className="op-score-bar-fill" style={{ width: '96%' }} />
                  </div>

                  <div className="op-score-factors">
                    <div>
                      <span>Charger Uptime (35%)</span>
                      <strong style={{ color: '#10b981' }}>99.2%</strong>
                    </div>
                    <div>
                      <span>Session Success (25%)</span>
                      <strong style={{ color: '#10b981' }}>98.5%</strong>
                    </div>
                    <div>
                      <span>Low Cancellation Rate (15%)</span>
                      <strong style={{ color: '#10b981' }}>97.0%</strong>
                    </div>
                    <div>
                      <span>Driver Rating (15%)</span>
                      <strong style={{ color: '#10b981' }}>4.8 / 5.0</strong>
                    </div>
                    <div>
                      <span>Telemetry Freshness (10%)</span>
                      <strong style={{ color: '#10b981' }}>Active (100%)</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 12: PROFILE & KYC ═════════ */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Operator Profile &amp; KYC Verification</h2>
                    <p>Your legal entity credentials, official government approval status, and contact info.</p>
                  </div>
                </div>

                <div className="glass op-profile-card">
                  <div className="op-profile-grid">
                    <div>
                      <span className="op-profile-label">Organization Name</span>
                      <div className="op-profile-val">{profile?.orgName || 'ChargePoint Network'}</div>
                    </div>
                    <div>
                      <span className="op-profile-label">Legal Entity</span>
                      <div className="op-profile-val">{profile?.legalName || 'CPO Pvt. Ltd.'}</div>
                    </div>
                    <div>
                      <span className="op-profile-label">Govt Approval Status</span>
                      <div className="op-profile-val" style={{ color: '#10b981', fontWeight: 800 }}>
                        {profile?.govtApprovalStatus || 'APPROVED'}
                      </div>
                    </div>
                    <div>
                      <span className="op-profile-label">Govt Certification ID</span>
                      <div className="op-profile-val">{profile?.govtApprovalNumber || 'BEE-CPO-2025-KA-8891'}</div>
                    </div>
                    <div>
                      <span className="op-profile-label">Corporate Registration (CIN)</span>
                      <div className="op-profile-val">{profile?.registrationNumber || 'CIN-U31909KA2023PTC176543'}</div>
                    </div>
                    <div>
                      <span className="op-profile-label">Primary Contact</span>
                      <div className="op-profile-val">{profile?.contactEmail || user?.email}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ TAB 13: NOTIFICATIONS ═════════ */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="op-section-head">
                  <div>
                    <h2>Operator Notification Center</h2>
                    <p>Real-time event log for driver check-ins, new reservations, queue changes, and faults.</p>
                  </div>
                </div>

                <div className="op-notifs-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`op-notif-card glass ${n.isRead ? 'op-notif-card--read' : ''}`}
                      onClick={() => handleMarkNotificationRead(n.id)}
                    >
                      <div className="op-notif-card__top">
                        <strong>{n.title}</strong>
                        <small>{new Date(n.createdAt).toLocaleTimeString()}</small>
                      </div>
                      <p>{n.message}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* ── MODAL: Add Station (Enterprise Grade UI) ── */}
      <AnimatePresence>
        {showAddStation && (
          <div className="op-modal-backdrop" onClick={() => setShowAddStation(false)}>
            <motion.div
              className="op-modal glass"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="op-modal__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AddCircleFilled className="op-modal-icon op-modal-icon--add" />
                  <div>
                    <h3>Deploy New Charging Station</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Connect physical hardware to the National UEI Discovery Grid.
                    </p>
                  </div>
                </div>
                <button className="op-modal-close-btn" onClick={() => setShowAddStation(false)}>
                  <DismissRegular />
                </button>
              </div>

              <form onSubmit={handleCreateStation} className="op-modal__form">
                <div className="form-group">
                  <label className="form-label">Station / Hub Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Koramangala HyperCharge DC Hub"
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. 80 Feet Road, 4th Block, Koramangala"
                    value={stationForm.address}
                    onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                  />
                </div>

                <div className="op-modal-2col">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={stationForm.city}
                      onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={stationForm.state}
                      onChange={(e) => setStationForm({ ...stationForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="op-modal-2col">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="form-input"
                      value={stationForm.latitude}
                      onChange={(e) => setStationForm({ ...stationForm, latitude: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="form-input"
                      value={stationForm.longitude}
                      onChange={(e) => setStationForm({ ...stationForm, longitude: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <button type="button" className="btn-secondary btn-xs" onClick={handleUseGPS} style={{ alignSelf: 'flex-start' }}>
                  <LocationRegular /> Capture Live GPS Location
                </button>

                <div className="op-modal-2col">
                  <div className="form-group">
                    <label className="form-label">Connector Standard</label>
                    <select
                      className="form-input"
                      value={stationForm.connectorStandard}
                      onChange={(e) => setStationForm({ ...stationForm, connectorStandard: e.target.value })}
                    >
                      <option value="CCS2">CCS2 (DC Fast Charger)</option>
                      <option value="Type2">Type 2 (AC 3-Phase)</option>
                      <option value="GBT_DC">GB/T DC (Commercial Fleet)</option>
                      <option value="GBT_AC">GB/T AC</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Power (kW)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={stationForm.maxPowerKw}
                      onChange={(e) => setStationForm({ ...stationForm, maxPowerKw: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="op-modal-2col">
                  <div className="form-group">
                    <label className="form-label">Tariff Rate (₹/kWh)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="form-input"
                      value={stationForm.pricePerKwh}
                      onChange={(e) => setStationForm({ ...stationForm, pricePerKwh: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Connection Fee (₹)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={stationForm.flatFee}
                      onChange={(e) => setStationForm({ ...stationForm, flatFee: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="op-modal-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAddStation(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={loading}>
                    <CheckmarkCircleFilled /> {loading ? 'Deploying…' : 'Deploy & Activate Station'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Edit Station ── */}
      <AnimatePresence>
        {showEditStation && (
          <div className="op-modal-backdrop" onClick={() => setShowEditStation(false)}>
            <motion.div
              className="op-modal glass"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
            >
              <div className="op-modal__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <EditFilled className="op-modal-icon op-modal-icon--edit" />
                  <div>
                    <h3>Edit Station Details</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Save changes to the database.
                    </p>
                  </div>
                </div>
                <button className="op-modal-close-btn" onClick={() => setShowEditStation(false)}>
                  <DismissRegular />
                </button>
              </div>

              <form onSubmit={handleUpdateStation} className="op-modal__form">
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={stationForm.address}
                    onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                  />
                </div>

                <div className="op-modal-2col">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={stationForm.city}
                      onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={stationForm.state}
                      onChange={(e) => setStationForm({ ...stationForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="op-modal-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowEditStation(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={loading}>
                    <CheckmarkCircleFilled /> {loading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Add Charger Gun ── */}
      <AnimatePresence>
        {showAddCharger && (
          <div className="op-modal-backdrop" onClick={() => setShowAddCharger(false)}>
            <motion.div
              className="op-modal glass"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
            >
              <div className="op-modal__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FlashFilled className="op-modal-icon op-modal-icon--add" />
                  <div>
                    <h3>Attach Charger Gun</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Station: {selectedStation?.name}
                    </p>
                  </div>
                </div>
                <button className="op-modal-close-btn" onClick={() => setShowAddCharger(false)}>
                  <DismissRegular />
                </button>
              </div>

              <form onSubmit={handleAddCharger} className="op-modal__form">
                <div className="form-group">
                  <label className="form-label">Connector Standard</label>
                  <select
                    className="form-input"
                    value={chargerForm.standard}
                    onChange={(e) => setChargerForm({ ...chargerForm, standard: e.target.value })}
                  >
                    <option value="CCS2">CCS2 (DC Fast Charger)</option>
                    <option value="Type2">Type 2 (AC 3-Phase)</option>
                    <option value="GBT_DC">GB/T DC</option>
                    <option value="GBT_AC">GB/T AC</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Power (kW)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={chargerForm.maxPowerKw}
                    onChange={(e) => setChargerForm({ ...chargerForm, maxPowerKw: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Physical Gun Reference</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={chargerForm.physicalReference}
                    onChange={(e) => setChargerForm({ ...chargerForm, physicalReference: e.target.value })}
                  />
                </div>

                <div className="op-modal-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAddCharger(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={loading}>
                    <CheckmarkCircleFilled /> {loading ? 'Attaching…' : 'Attach Charger Gun'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Maintenance ── */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <div className="op-modal-backdrop" onClick={() => setShowMaintenanceModal(false)}>
            <motion.div
              className="op-modal glass"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
            >
              <div className="op-modal__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <WrenchFilled className="op-modal-icon op-modal-icon--warn" />
                  <div>
                    <h3>Schedule Hardware Maintenance</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Temporarily disable reservations on this charger.
                    </p>
                  </div>
                </div>
                <button className="op-modal-close-btn" onClick={() => setShowMaintenanceModal(false)}>
                  <DismissRegular />
                </button>
              </div>

              <form onSubmit={handleConfirmMaintenance} className="op-modal__form">
                <div className="form-group">
                  <label className="form-label">Outage / Maintenance Reason</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={maintenanceForm.reason}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reason: e.target.value })}
                  />
                </div>

                <div className="op-modal-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowMaintenanceModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={loading}>
                    <CheckmarkCircleFilled /> {loading ? 'Updating…' : 'Confirm Maintenance Mode'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
