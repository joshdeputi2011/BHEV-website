import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  NavigationRegular,
  SearchRegular,
  FlashRegular,
  LocationRegular,
  ArrowResetRegular,
  GlobeRegular,
  CalendarRegular,
  PeopleRegular,
  AlertUrgentRegular,
  VehicleCarRegular,
  PlugConnectedRegular,
  QrCodeRegular,
  DismissRegular,
  CheckmarkCircleRegular,
  WarningRegular
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import MapplsStationMap from '../components/MapplsStationMap';
import BookingModal from '../components/BookingModal';
import './Discover.css';

const api = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

function initials(s) {
  const x = (s || 'EV').trim().split(/\s+/).slice(0, 2).map((v) => v[0]).join('').toUpperCase();
  return x || 'EV';
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ALIASES = {
  bangalore: ['bengaluru', 'karnataka'],
  bengaluru: ['bangalore', 'karnataka'],
  gurgaon: ['gurugram', 'haryana'],
  gurugram: ['gurgaon', 'haryana'],
  bombay: ['mumbai', 'maharashtra'],
  mumbai: ['bombay', 'maharashtra'],
  calcutta: ['kolkata', 'west bengal'],
  kolkata: ['calcutta', 'west bengal'],
  madras: ['chennai', 'tamil nadu'],
  chennai: ['madras', 'tamil nadu'],
  pondicherry: ['puducherry'],
  puducherry: ['pondicherry'],
  tata: ['tata power', 'tp'],
  iocl: ['indian oil', 'indian oil corporation'],
  bpcl: ['bharat petroleum'],
  hpcl: ['hindustan petroleum'],
  ather: ['ather energy', 'ather grid']
};

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Discover() {
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [allStations, setAllStations] = useState([]);
  const [meta, setMeta] = useState({
    mapped_location_groups: 29085,
    mappable_connector_rows: 39047,
    states_with_data: 34,
    states: [],
    connector_categories: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedConnector, setSelectedConnector] = useState('');
  const [selectedPower, setSelectedPower] = useState('0');
  const [selectedOwnership, setSelectedOwnership] = useState('');
  const [selectedRadius, setSelectedRadius] = useState('0');

  // Map & interaction states
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [bookingBusy, setBookingBusy] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingStation, setBookingStation] = useState(null);
  const [bookingConnectorId, setBookingConnectorId] = useState(null);
  const [evStatus, setEvStatus] = useState(null);
  const [evBusy, setEvBusy] = useState(false);

  // QR Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrLookupResult, setQrLookupResult] = useState(null);
  const [qrLookupLoading, setQrLookupLoading] = useState(false);
  const [qrError, setQrError] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);
    return () => clearTimeout(handler);
  }, [query]);

  // Auto-detect user's location
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        console.info('Auto-location check notice:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Load dataset
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const staticJsonUrl = `${basePath}data/bee-stations.json`.replace(/\/+/g, '/');
      const staticMetaUrl = `${basePath}data/source-meta.json`.replace(/\/+/g, '/');

      let staticList = [];
      let liveList = [];
      let metaData = null;

      // 1. Fetch static BEE dataset
      try {
        let res = await fetch(staticJsonUrl);
        if (!res.ok) res = await fetch('/data/bee-stations.json');
        if (res.ok) {
          const data = await res.json();
          staticList = data.stations || data || [];
          if (data.meta) metaData = data.meta;
        }
      } catch (e) {
        console.warn('Static JSON fetch fallback:', e);
      }

      // 2. Fetch live operator stations from backend
      try {
        const resLive = await fetch(`${api}/api/v1/stations?limit=200`);
        if (resLive.ok) {
          const payload = await resLive.json();
          liveList = payload.data || [];
        }
      } catch (e) {
        console.warn('Backend stations fetch notice:', e);
      }

      const combinedRaw = [...liveList, ...staticList];
      const seenIds = new Set();
      const stationsData = combinedRaw.filter((s) => {
        if (!s || !s.id) return false;
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });

      if (!metaData) {
        try {
          const resMeta = await fetch(staticMetaUrl);
          if (resMeta.ok) metaData = await resMeta.json();
        } catch (_) {}
      }

      if (stationsData && stationsData.length > 0) {
        const processed = stationsData.map((s) => {
          const connectors = Array.isArray(s.connectors)
            ? s.connectors.map((c) => c.standard || c)
            : Array.isArray(s.connector_types)
              ? s.connector_types
              : Array.isArray(s.connector_categories)
                ? s.connector_categories
                : [];

          const cpo = s.cpo || s.operator?.name || '';
          const location = s.location || s.address || '';
          const city = s.city || '';
          const district = s.district || '';
          const state = s.state || '';
          const ownership = s.ownership || '';
          const pincode = s.pincode || s.postal_code || '';

          const searchTokens = [
            s.name,
            cpo,
            location,
            city,
            district,
            state,
            ownership,
            pincode,
            ...connectors
          ]
            .map(normalizeText)
            .filter(Boolean);

          const cityNorm = normalizeText(city);
          if (ALIASES[cityNorm]) searchTokens.push(...ALIASES[cityNorm]);
          const cpoNorm = normalizeText(cpo);
          if (ALIASES[cpoNorm]) searchTokens.push(...ALIASES[cpoNorm]);

          return {
            ...s,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            maxPowerKw: Number(s.maxPowerKw || s.max_power_kw || s.charger_ratings_kw?.[0] || 0),
            connectorsList: connectors,
            nameNorm: normalizeText(s.name),
            cityNorm,
            districtNorm: normalizeText(district),
            cpoNorm,
            stateNorm: normalizeText(state),
            _search: searchTokens.join(' ')
          };
        });

        setAllStations(processed);
      }

      if (metaData) {
        setMeta({
          mapped_location_groups: metaData.mapped_location_groups || 29085,
          mappable_connector_rows: metaData.mappable_connector_rows || 39047,
          states_with_data: metaData.states_with_data || 34,
          states: metaData.states || [],
          connector_categories: metaData.connector_categories || []
        });
      }
    } catch (err) {
      setError('Unable to load EV station infrastructure network.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering
  const filteredStations = useMemo(() => {
    if (!allStations || allStations.length === 0) return [];

    const normQuery = normalizeText(debouncedQuery);
    const minPower = Number(selectedPower) || 0;
    const radius = Number(selectedRadius) || 0;
    const hasLocation = Boolean(userLocation && Number.isFinite(userLocation.lat));

    let result = allStations.filter((s) => {
      if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) return false;

      if (normQuery && !s._search.includes(normQuery)) {
        return false;
      }

      if (selectedState && !s.stateNorm.includes(normalizeText(selectedState))) {
        return false;
      }

      if (selectedConnector) {
        const cn = normalizeText(selectedConnector);
        const match = s.connectorsList.some((c) => normalizeText(c).includes(cn));
        if (!match) return false;
      }

      if (minPower > 0 && s.maxPowerKw < minPower) {
        return false;
      }

      if (selectedOwnership) {
        const o = (s.ownership || '').toLowerCase();
        if (selectedOwnership === 'Govt.' && !o.includes('govt') && !o.includes('psu') && !o.includes('municipal')) return false;
        if (selectedOwnership === 'Private' && (o.includes('govt') || o.includes('psu'))) return false;
      }

      return true;
    });

    if (hasLocation) {
      result = result.map((s) => ({
        ...s,
        _distance: haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude)
      }));

      if (radius > 0) {
        result = result.filter((s) => s._distance <= radius);
      }

      result.sort((a, b) => a._distance - b._distance);
    }

    return result;
  }, [
    allStations,
    debouncedQuery,
    selectedState,
    selectedConnector,
    selectedPower,
    selectedOwnership,
    selectedRadius,
    userLocation
  ]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocating(false);
        setFitTrigger((t) => t + 1);
      },
      (err) => {
        setLocating(false);
        alert(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReset = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedState('');
    setSelectedConnector('');
    setSelectedPower('0');
    setSelectedOwnership('');
    setSelectedRadius('0');
    setSelectedStation(null);
  };

  const bestConnectorFor = (station) => {
    if (Array.isArray(station?.connectors) && station.connectors.length > 0) {
      return station.connectors[0];
    }
    const standard = station?.connectorsList?.[0] || 'CCS2';
    return {
      id: `${station.id}-conn-01`,
      standard,
      powerType: String(standard).toLowerCase().includes('dc') ? 'DC' : 'AC',
      maxPowerKw: station.maxPowerKw || 60,
      status: 'AVAILABLE'
    };
  };

  const navigateStation = (station) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Direct Start Charging Session
  const handleStartCharging = async (station, connector) => {
    if (!isAuthenticated) {
      alert('Please sign in to start a charging session.');
      navigate('/login');
      return;
    }

    const conn = connector || bestConnectorFor(station);
    const key = `${station.id}-${conn.id}-charging`;
    setBookingBusy(key);

    try {
      const res = await fetch(`${api}/api/v1/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stationId: station.id,
          connectorId: conn.id,
          initialSoc: 25,
          vehicleName: evStatus?.vehicleName || 'Tata Nexon EV Max'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to start charging session');
      }

      setBookingResult({
        type: 'success',
        title: 'Charging Session Started!',
        message: `Connected to ${conn.standard} (${conn.maxPowerKw} kW) at ${station.name}. Navigating to live telemetry…`
      });

      setTimeout(() => {
        navigate('/sessions');
      }, 1200);
    } catch (err) {
      setBookingResult({
        type: 'error',
        title: 'Charging Session Blocked',
        message: err.message
      });
    } finally {
      setBookingBusy('');
    }
  };

  // QR Lookup & Direct Connect
  const handleLookupQR = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    setQrLookupLoading(true);
    setQrError('');
    setQrLookupResult(null);

    try {
      const trimmed = qrInput.trim();
      let res;
      if (trimmed.includes('.')) {
        // Encrypted dynamic token
        res = await fetch(`${api}/api/v1/arrivals/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: trimmed })
        });
      } else {
        // Charger ID
        res = await fetch(`${api}/api/v1/chargers/${trimmed}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Charger not found or token invalid.');

      setQrLookupResult(data.data);
    } catch (err) {
      setQrError(err.message);
    } finally {
      setQrLookupLoading(false);
    }
  };

  const bookStation = async (station, bookingType = 'STANDARD') => {
    const connector = bestConnectorFor(station);
    if (!connector) return;

    const key = `${station.id}-${connector.id}-${bookingType}`;
    setBookingBusy(key);
    try {
      const start = new Date(Date.now() + 5 * 60 * 1000);
      const res = await fetch(`${api}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: station.id,
          connectorId: connector.id,
          slotStart: start.toISOString(),
          slotEnd: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          bookingType,
          emergency: bookingType === 'EMERGENCY',
          driverName: user?.name || 'EV Driver',
          driverEmail: user?.email || 'driver@chargegrid.local',
          vehicleName: evStatus?.vehicleName || 'Tata Nexon EV Max'
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || payload.message || 'Booking failed');
      setBookingResult({
        type: bookingType,
        title: payload.message || 'Booking created',
        message: `${payload.data.bookingRef || payload.data.externalRef} • ${payload.data.stationName || station.name}`,
        data: payload.data
      });
      await loadData();
    } catch (err) {
      setBookingResult({
        type: 'error',
        title: 'Booking could not be completed',
        message: err.message || 'Please try again.'
      });
    } finally {
      setBookingBusy('');
    }
  };

  const connectMockEv = async () => {
    setEvBusy(true);
    try {
      const res = await fetch(`${api}/api/v1/iot/mock-ev/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleName: 'Tata Nexon EV Max', bluetoothId: 'BHEV-WEB-BLE-01' })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || payload.message || 'Could not connect EV');
      setEvStatus(payload.data);
    } catch (err) {
      setBookingResult({ type: 'error', title: 'Bluetooth EV handshake failed', message: err.message });
    } finally {
      setEvBusy(false);
    }
  };

  const statesList = meta.states && meta.states.length > 0 ? meta.states : [];
  const connectorsList =
    meta.connector_categories && meta.connector_categories.length > 0
      ? meta.connector_categories
      : [
          'Type 2 AC',
          'LEV AC',
          'CCS2 / CCS',
          'LEV DC',
          'Bharat AC-001',
          'Bharat DC-001',
          'CHAdeMO',
          'Combo / multi-standard'
        ];

  return (
    <main className="discover">
      {/* ── QR Scanner / Code Entry Modal ── */}
      {showQrModal && (
        <div className="discover__qr-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="discover__qr-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="discover__qr-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <QrCodeRegular style={{ fontSize: '1.4rem', color: '#10b981' }} />
                <h3>Scan or Enter Charger Code</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowQrModal(false)}>
                <DismissRegular />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
              Paste dynamic QR token or enter charger pedestal ID (e.g. <code>CHG-4B19A20F</code>) to verify and unlock charging.
            </p>

            <form onSubmit={handleLookupQR} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="discover__search-input"
                style={{ flex: 1 }}
                placeholder="Enter Charger ID or paste QR payload..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                autoFocus
              />
              <button className="btn-primary" type="submit" disabled={qrLookupLoading || !qrInput.trim()}>
                {qrLookupLoading ? 'Verifying…' : 'Inspect'}
              </button>
            </form>

            {qrError && (
              <div className="discover__booking-toast discover__booking-toast--error" style={{ marginBottom: 16 }}>
                <WarningRegular />
                <span>{qrError}</span>
              </div>
            )}

            {qrLookupResult && (
              <div className="discover__qr-result-card glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                      {qrLookupResult.stationName || 'Charging Station'}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {qrLookupResult.address || ''} · Charger ID: <strong>{qrLookupResult.id || qrLookupResult.connectorId}</strong>
                    </p>
                  </div>
                  <span className={`discover__tag discover__tag--status discover__tag--${String(qrLookupResult.status).toLowerCase()}`}>
                    {qrLookupResult.status || 'AVAILABLE'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', marginBottom: 16 }}>
                  <span>🔌 Standard: <strong>{qrLookupResult.standard || 'CCS2'}</strong></span>
                  <span>⚡ Max Power: <strong>{qrLookupResult.maxPowerKw || 60} kW</strong></span>
                  <span>💰 Tariff: <strong>₹{qrLookupResult.tariff?.pricePerKwh ?? 14.5}/kWh</strong></span>
                </div>

                {qrLookupResult.status === 'AVAILABLE' ? (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setShowQrModal(false);
                      handleStartCharging(
                        { id: qrLookupResult.stationId, name: qrLookupResult.stationName },
                        { id: qrLookupResult.id || qrLookupResult.connectorId, standard: qrLookupResult.standard, maxPowerKw: qrLookupResult.maxPowerKw }
                      );
                    }}
                  >
                    <FlashRegular /> Start Charging Now
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 600 }}>
                    Charger is currently {qrLookupResult.status}. Please select an available charger.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Intro Section ── */}
      <section className="discover__intro container-wide">
        <div className="discover__header-row">
          <div>
            <span className="discover__eyebrow">
              <FlashRegular /> URJAA • NATIONAL EV DISCOVERY MAP
            </span>
            <h1>
              One Map. <span className="tiranga-gradient-text">29,000+ EV Chargers in India.</span>
            </h1>
            <p>
              Official Bureau of Energy Efficiency (BEE) national infrastructure grid unified with
              live CPO networks. Explore public and private charging stations across all 34 states and union territories.
            </p>
          </div>
          <div className="discover__dataset-badge">
            <GlobeRegular className="discover__dataset-icon" />
            <div>
              <strong>Official National Grid</strong>
              <span>{fmt(meta.mapped_location_groups || 29085)} Locations Mapped</span>
            </div>
          </div>
        </div>

        {/* ── Control Bar ── */}
        <div className="discover__control-card glass">
          <div className="discover__search-row">
            <div className="discover__search-wrap">
              <SearchRegular className="discover__search-icon" />
              <input
                className="discover__search-input"
                placeholder="Search city, station name, CPO, district, address (e.g. Tata Power, Bengaluru, Mumbai, IOCL)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="discover__search-clear"
                  onClick={() => {
                    setQuery('');
                    setDebouncedQuery('');
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="discover__quick-actions">
              <button
                className="btn-primary btn-sm"
                onClick={() => setShowQrModal(true)}
                title="Scan QR code or enter Charger ID to start session"
              >
                <QrCodeRegular /> Scan QR / Code
              </button>
              <button
                className={`btn-primary btn-sm ${userLocation ? 'btn-primary--active' : ''}`}
                onClick={handleLocateMe}
                disabled={locating}
                title={userLocation ? 'Location active: click to refresh' : 'Detect your current location'}
              >
                <LocationRegular /> {locating ? 'Locating…' : userLocation ? '📍 Located' : '📍 Detect Location'}
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setFitTrigger((t) => t + 1)}
                title="Fit map view to search results"
              >
                ⌗ Fit Results
              </button>
              <button
                className="btn-secondary btn-sm btn-icon"
                onClick={handleReset}
                title="Reset all filters"
              >
                <ArrowResetRegular />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="discover__filter-grid">
            <label className="discover__filter-item">
              <span>State / UT</span>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="">All States & UTs (34)</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            <label className="discover__filter-item">
              <span>Connector Standard</span>
              <select
                value={selectedConnector}
                onChange={(e) => setSelectedConnector(e.target.value)}
              >
                <option value="">All Connectors</option>
                {connectorsList.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))}
              </select>
            </label>

            <label className="discover__filter-item">
              <span>Min. Power (kW)</span>
              <select value={selectedPower} onChange={(e) => setSelectedPower(e.target.value)}>
                <option value="0">Any Power Rating</option>
                <option value="7">7 kW+ (Fast AC)</option>
                <option value="25">25 kW+ (DC Fast)</option>
                <option value="50">50 kW+ (Rapid DC)</option>
                <option value="100">100 kW+ (Ultra Rapid)</option>
              </select>
            </label>

            <label className="discover__filter-item">
              <span>Ownership</span>
              <select
                value={selectedOwnership}
                onChange={(e) => setSelectedOwnership(e.target.value)}
              >
                <option value="">Govt. & Private</option>
                <option value="Govt.">Government / PSU</option>
                <option value="Private">Private CPOs</option>
              </select>
            </label>

            <label className="discover__filter-item">
              <span>Distance Radius</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(e.target.value)}
                disabled={!userLocation}
              >
                <option value="0">Any Distance</option>
                <option value="10">≤ 10 km</option>
                <option value="25">≤ 25 km</option>
                <option value="50">≤ 50 km</option>
                <option value="100">≤ 100 km</option>
                <option value="200">≤ 200 km</option>
              </select>
            </label>
          </div>

          {/* Stats bar */}
          <div className="discover__stats-row">
            <div className="discover__stat-pill">
              <strong>{fmt(meta.mapped_location_groups || 29085)}</strong>
              <span>National Stations</span>
            </div>
            <div className="discover__stat-pill">
              <strong>{fmt(meta.mappable_connector_rows || 39047)}</strong>
              <span>Charger Points</span>
            </div>
            <div className="discover__stat-pill">
              <strong>{fmt(meta.states_with_data || 34)}</strong>
              <span>States Covered</span>
            </div>
            <div className="discover__stat-pill discover__stat-pill--highlight">
              <strong>{fmt(filteredStations.length)}</strong>
              <span>{debouncedQuery || selectedState ? 'Matches Found' : userLocation ? 'Nearby Visible' : 'Visible'}</span>
            </div>
          </div>

          <div className="discover__ev-row">
            <button className="btn-secondary btn-sm" onClick={connectMockEv} disabled={evBusy}>
              <VehicleCarRegular /> {evBusy ? 'Connecting...' : evStatus ? 'EV Connected' : 'Connect Mock EV'}
            </button>
            {evStatus && (
              <div className="discover__ev-status">
                <PlugConnectedRegular />
                <span>{evStatus.vehicleName}</span>
                <strong>{Math.round(evStatus.socPercent)}% SoC</strong>
                <span>{evStatus.rangeKm || 312} km range</span>
              </div>
            )}
            {bookingResult && (
              <div className={`discover__booking-toast discover__booking-toast--${bookingResult.type}`}>
                <strong>{bookingResult.title}</strong>
                <span>{bookingResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Content: Map + Station List ── */}
      <section className="discover__content container-wide">
        {/* Left Side: Map Panel */}
        <div className="discover__map-panel">
          <MapplsStationMap
            stations={filteredStations}
            selectedStation={selectedStation}
            onSelect={setSelectedStation}
            userLocation={userLocation}
            fitTrigger={fitTrigger}
          />
        </div>

        {/* Right Side: Interactive Station List */}
        <aside className="discover__list glass" aria-live="polite">
          <header className="discover__list-header">
            <div>
              <span className="discover__list-count">
                {loading ? 'Loading…' : `${fmt(filteredStations.length)} STATIONS MATCHED`}
              </span>
              <h2>{debouncedQuery ? `Results for "${debouncedQuery}"` : userLocation ? 'Nearest Stations to You' : 'Charging Points'}</h2>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => setFitTrigger((t) => t + 1)}>
              Fit Map
            </button>
          </header>

          {error && <p className="discover__error">{error}</p>}

          {loading && (
            <div className="discover__loading-state">
              <div className="discover__spinner"></div>
              <p>Loading national EV stations from BEE dataset…</p>
            </div>
          )}

          {!loading && !error && filteredStations.length === 0 && (
            <div className="discover__empty-state">
              <p>No charging stations matched &ldquo;{query}&rdquo; with current filters.</p>
              <button className="btn-secondary btn-sm" onClick={handleReset}>
                Reset Filters
              </button>
            </div>
          )}

          {!loading && !error && filteredStations.length > 0 && (
            <div className="discover__cards-scroll">
              {filteredStations.slice(0, 150).map((station) => {
                const cpoName = station.cpo || station.operator?.name || 'Operator';
                const isSelected = selectedStation?.id === station.id;
                const connector = bestConnectorFor(station);
                const chargerSummary = station.chargerSummary || {};
                const chargerStatus = station.chargerStatus || connector?.visualState || connector?.status || 'AVAILABLE';
                const actionKey = connector ? `${station.id}-${connector.id}` : station.id;

                return (
                  <article
                    key={station.id}
                    className={`discover__station-card ${
                      isSelected ? 'discover__station-card--selected' : ''
                    }`}
                    onClick={() => setSelectedStation(station)}
                  >
                    <div className="discover__card-top">
                      <div className="discover__cpo-avatar">{initials(cpoName)}</div>
                      <div className="discover__card-main">
                        <div className="discover__cpo-label">
                          {cpoName} • {station.ownership || 'Public / CPO'}
                        </div>
                        <h3 className="discover__station-title">{station.name}</h3>
                        <p className="discover__station-addr">
                          {station.location || station.address}
                          {station.city ? `, ${station.city}` : ''}
                          {station.state ? `, ${station.state}` : ''}
                        </p>
                      </div>

                      {station._distance != null && (
                        <div className="discover__distance-badge">
                          {station._distance < 10
                            ? station._distance.toFixed(1)
                            : Math.round(station._distance)}{' '}
                          km
                        </div>
                      )}
                    </div>

                    <div className="discover__tags-row">
                      {station.connectorsList.slice(0, 3).map((conn, idx) => (
                        <span key={idx} className="discover__tag discover__tag--conn">
                          {conn}
                        </span>
                      ))}
                      {station.maxPowerKw > 0 && (
                        <span className="discover__tag discover__tag--power">
                          {station.maxPowerKw} kW Max
                        </span>
                      )}
                      <span className="discover__tag discover__tag--source">Live Feed</span>
                    </div>

                    <div className={`discover__charger-strip discover__charger-strip--${String(chargerStatus).toLowerCase()}`}>
                      <div>
                        <strong>{chargerStatus}</strong>
                        <span>
                          {chargerSummary.available ?? station.availableConnectors ?? 1} free • {chargerSummary.booked ?? 0} booked • {chargerSummary.charging ?? 0} charging
                        </span>
                      </div>
                      <small>{station.nextAvailableMins === 0 ? 'Ready now' : `${station.nextAvailableMins || 15} min wait`}</small>
                    </div>

                    <footer className="discover__card-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingConnectorId(connector?.id);
                          setBookingStation(station);
                        }}
                      >
                        <CalendarRegular /> Book Slot
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCharging(station, connector);
                        }}
                        disabled={bookingBusy === `${actionKey}-charging`}
                      >
                        <FlashRegular /> {bookingBusy === `${actionKey}-charging` ? 'Connecting…' : 'Quick Start'}
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateStation(station);
                        }}
                      >
                        <NavigationRegular /> Route
                      </button>
                    </footer>
                  </article>
                );
              })}

              {filteredStations.length > 150 && (
                <div className="discover__list-footer-note">
                  Showing top 150 of {fmt(filteredStations.length)} matched stations. Use search or filters to narrow down your area.
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ── Interactive Slot Booking Modal ── */}
      {bookingStation && (
        <BookingModal
          station={bookingStation}
          isOpen={!!bookingStation}
          onClose={() => setBookingStation(null)}
          preselectedConnectorId={bookingConnectorId}
          onBookingSuccess={() => loadData()}
        />
      )}
    </main>
  );
}
