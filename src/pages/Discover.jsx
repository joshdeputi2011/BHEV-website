import { useCallback, useEffect, useMemo, useState } from 'react';
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
  PlugConnectedRegular
} from '@fluentui/react-icons';
import MapplsStationMap from '../components/MapplsStationMap';
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

// Synonyms and aliases for Indian cities and operators to ensure 100% search accuracy
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
  const [evStatus, setEvStatus] = useState(null);
  const [evBusy, setEvBusy] = useState(false);

  // Debounce search query to keep typing ultra-fluid
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);
    return () => clearTimeout(handler);
  }, [query]);

  // 1. Auto-detect user's location on initial mount silently
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
        console.info('Auto-location check completed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // 2. Load dataset
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const staticJsonUrl = `${basePath}data/bee-stations.json`.replace(/\/+/g, '/');
        const staticMetaUrl = `${basePath}data/source-meta.json`.replace(/\/+/g, '/');

        let staticList = [];
        let liveList = [];
        let metaData = null;
        let stationsData = [];

        // 1. Fetch static BEE dataset (try base path, then direct data path)
        try {
          let res = await fetch(staticJsonUrl);
          if (!res.ok) {
            res = await fetch('/data/bee-stations.json');
          }
          if (res.ok) {
            const data = await res.json();
            staticList = data.stations || data || [];
            if (data.meta) metaData = data.meta;
          }
        } catch (e) {
          console.warn('Static JSON fetch fallback:', e);
        }

        // 2. Fetch live operator stations from backend database
        try {
          const resLive = await fetch(`${api}/api/v1/stations?limit=100`);
          if (resLive.ok) {
            const payload = await resLive.json();
            liveList = payload.data || [];
          }
        } catch (e) {
          console.warn('Backend live stations fetch skipped/offline:', e);
        }

        // 3. Read custom local operator stations (instant multi-tab sync)
        let localCustom = [];
        try {
          const stored = localStorage.getItem('bhev_custom_stations');
          if (stored) localCustom = JSON.parse(stored);
        } catch (e) {
          // ignore
        }

        // Merge: Live backend + Local Custom at the very top, followed by 29k national stations
        const combinedRaw = [...localCustom, ...liveList, ...staticList];
        
        // Deduplicate by ID
        const seenIds = new Set();
        stationsData = combinedRaw.filter((s) => {
          if (!s || !s.id) return false;
          if (seenIds.has(s.id)) return false;
          seenIds.add(s.id);
          return true;
        });

        if (!metaData) {
          try {
            const resMeta = await fetch(staticMetaUrl);
            if (resMeta.ok) {
              metaData = await resMeta.json();
            }
          } catch (e) {
            // ignore
          }
        }

        if (cancelled) return;

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

            // Normalized token array for sub-millisecond multi-attribute matching
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

            // Add city/operator aliases
            const cityNorm = normalizeText(city);
            if (ALIASES[cityNorm]) {
              searchTokens.push(...ALIASES[cityNorm]);
            }
            const cpoNorm = normalizeText(cpo);
            if (ALIASES[cpoNorm]) {
              searchTokens.push(...ALIASES[cpoNorm]);
            }

            const searchIndex = searchTokens.join(' ');

            return {
              ...s,
              latitude: Number(s.latitude),
              longitude: Number(s.longitude),
              maxPowerKw: Number(s.maxPowerKw || s.max_power_kw || 0),
              connectorsList: connectors,
              nameNorm: normalizeText(s.name),
              cityNorm: normalizeText(city),
              districtNorm: normalizeText(district),
              cpoNorm: normalizeText(cpo),
              stateNorm: normalizeText(state),
              _search: searchIndex
            };
          });

          setAllStations(processed);

          if (metaData) {
            setMeta(metaData);
          } else {
            const states = [...new Set(processed.map((s) => s.state).filter(Boolean))].sort();
            const connCats = [
              ...new Set(
                processed.flatMap((s) => s.connector_categories || s.connectorsList || [])
              )
            ].sort();

            setMeta({
              mapped_location_groups: processed.length,
              mappable_connector_rows: processed.length,
              states_with_data: states.length,
              states,
              connector_categories: connCats
            });
          }
        } else {
          throw new Error('No charging station data could be loaded.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load EV charging stations.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter and Relevance Ranking Logic
  const filteredStations = useMemo(() => {
    const rawQuery = normalizeText(debouncedQuery);
    const queryWords = rawQuery ? rawQuery.split(' ').filter(Boolean) : [];
    const minPower = Number(selectedPower);
    const rad = Number(selectedRadius);

    // Expand search keywords with aliases
    const expandedWords = [...queryWords];
    for (const w of queryWords) {
      if (ALIASES[w]) {
        expandedWords.push(...ALIASES[w]);
      }
    }

    return allStations
      .map((s) => {
        let dist = null;
        if (userLocation) {
          dist = haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude);
        }

        // Calculate relevance score when user is searching
        let relevance = 0;
        if (queryWords.length > 0) {
          // Exact match in station name
          if (s.nameNorm.includes(rawQuery)) relevance += 100;
          // Exact match in city or district
          if (s.cityNorm.includes(rawQuery) || s.districtNorm.includes(rawQuery)) relevance += 80;
          // Exact match in CPO operator
          if (s.cpoNorm.includes(rawQuery)) relevance += 60;
          // State match
          if (s.stateNorm.includes(rawQuery)) relevance += 40;

          // Individual word hits
          for (const w of queryWords) {
            if (s.nameNorm.includes(w)) relevance += 25;
            if (s.cityNorm.includes(w) || s.districtNorm.includes(w)) relevance += 20;
            if (s.cpoNorm.includes(w)) relevance += 15;
            if (s._search.includes(w)) relevance += 10;
          }
        }

        return { ...s, _distance: dist, _relevance: relevance };
      })
      .filter((s) => {
        // Multi-word search matching: all entered words must be present
        if (queryWords.length > 0) {
          const matchAll = queryWords.every((word) => {
            if (s._search.includes(word)) return true;
            // Check if any alias of the word matches
            if (ALIASES[word] && ALIASES[word].some((alias) => s._search.includes(alias))) {
              return true;
            }
            return false;
          });
          if (!matchAll) return false;
        }

        // State filter
        if (selectedState && s.state !== selectedState) return false;

        // Connector filter
        if (
          selectedConnector &&
          !s.connectorsList.some((c) =>
            String(c).toLowerCase().includes(selectedConnector.toLowerCase())
          )
        ) {
          return false;
        }

        // Ownership filter
        if (selectedOwnership && s.ownership !== selectedOwnership) return false;

        // Minimum Power filter
        if (minPower > 0 && s.maxPowerKw < minPower) return false;

        // Distance radius filter only applies if selectedRadius > 0
        if (userLocation && rad > 0 && s._distance != null && s._distance > rad) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // 1. If searching, prioritize relevance score first
        if (queryWords.length > 0) {
          if (b._relevance !== a._relevance) {
            return b._relevance - a._relevance;
          }
        }
        // 2. Secondary sort by distance if user location is available
        if (userLocation && a._distance != null && b._distance != null) {
          return a._distance - b._distance;
        }
        return 0;
      });
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

  // Manual Geolocation Trigger
  const handleLocateMe = useCallback(() => {
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
        setFitTrigger((prev) => prev + 1);
      },
      (err) => {
        setLocating(false);
        alert('Could not determine your location. Please check browser location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Reset Filters
  const handleReset = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedState('');
    setSelectedConnector('');
    setSelectedPower('0');
    setSelectedOwnership('');
    setSelectedRadius('0');
    setSelectedStation(null);
    setFitTrigger((prev) => prev + 1);
  }, []);

  // Navigation link generator
  const navigateStation = (station) => {
    const dest = `${station.latitude},${station.longitude}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const bestConnectorFor = (station) => {
    const connectors = Array.isArray(station.connectors) ? station.connectors : [];
    return (
      connectors.find((connector) => String(connector.status).toUpperCase() === 'AVAILABLE') ||
      connectors.find((connector) => connector.id) ||
      null
    );
  };

  const bookStation = async (station, bookingType = 'STANDARD') => {
    const connector = bestConnectorFor(station);
    if (!connector) {
      setBookingResult({
        type: 'error',
        title: 'Connector data missing',
        message: 'This station has not published connector-level booking data yet.'
      });
      return;
    }

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
          driverName: 'Website EV Driver',
          driverEmail: 'web.driver@urjja.local',
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
      const liveRes = await fetch(`${api}/api/v1/stations?limit=100`);
      if (liveRes.ok) {
        const live = await liveRes.json();
        const liveData = live.data || [];
        if (liveData.length > 0) setAllStations(liveData.map((s) => ({ ...s, latitude: Number(s.latitude), longitude: Number(s.longitude), maxPowerKw: Number(s.maxPowerKw || 0), connectorsList: (s.connectors || []).map((c) => c.standard || c), nameNorm: normalizeText(s.name), cityNorm: normalizeText(s.city), districtNorm: normalizeText(s.district), cpoNorm: normalizeText(s.cpo || s.operator?.name), stateNorm: normalizeText(s.state), _search: normalizeText(`${s.name} ${s.city} ${s.address} ${s.operator?.name}`) })));
      }
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
      setBookingResult({ type: 'error', title: 'Bluetooth EV mock failed', message: err.message });
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
      {/* ── Intro Section ── */}
      <section className="discover__intro container-wide">
        <div className="discover__header-row">
          <div>
            <span className="discover__eyebrow">
              <FlashRegular /> URJJA • NATIONAL EV DISCOVERY MAP
            </span>
            <h1>
              One Map. <span className="tiranga-gradient-text">29,000+ EV Chargers in India.</span>
            </h1>
            <p>
              Official Bureau of Energy Efficiency (BEE) national infrastructure grid unified with
              MapmyIndia / Mappls. Explore public and private charging stations across all 34 states and union territories.
            </p>
          </div>
          <div className="discover__dataset-badge">
            <GlobeRegular className="discover__dataset-icon" />
            <div>
              <strong>Official BEE Snapshot</strong>
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
                <span>{evStatus.rangeKm} km range</span>
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
              <p>Loading 29,000+ national EV stations from BEE dataset…</p>
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
                const chargerStatus = station.chargerStatus || connector?.visualState || connector?.status || 'UNKNOWN';
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
                      <span className="discover__tag discover__tag--source">BEE Static</span>
                    </div>

                    <div className={`discover__charger-strip discover__charger-strip--${String(chargerStatus).toLowerCase()}`}>
                      <div>
                        <strong>{chargerStatus}</strong>
                        <span>
                          {chargerSummary.available ?? station.availableConnectors ?? 0} free • {chargerSummary.booked ?? 0} booked • {chargerSummary.charging ?? 0} charging
                        </span>
                      </div>
                      <small>{station.nextAvailableMins === 0 ? 'Ready now' : `${station.nextAvailableMins || 15} min wait`}</small>
                    </div>

                    <footer className="discover__card-actions">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStation(station);
                        }}
                      >
                        View on Map
                      </button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateStation(station);
                        }}
                      >
                        <NavigationRegular /> Google route
                      </button>
                    </footer>

                    <div className="discover__booking-actions">
                      <button
                        className="btn-primary btn-xs"
                        disabled={!connector || bookingBusy === `${actionKey}-STANDARD`}
                        onClick={(e) => {
                          e.stopPropagation();
                          bookStation(station, 'STANDARD');
                        }}
                      >
                        <CalendarRegular /> {bookingBusy === `${actionKey}-STANDARD` ? 'Booking...' : 'Book'}
                      </button>
                      <button
                        className="btn-secondary btn-xs"
                        disabled={!connector || bookingBusy === `${actionKey}-QUEUE`}
                        onClick={(e) => {
                          e.stopPropagation();
                          bookStation(station, 'QUEUE');
                        }}
                      >
                        <PeopleRegular /> Queue
                      </button>
                      <button
                        className="btn-secondary btn-xs discover__emergency-btn"
                        disabled={!connector || bookingBusy === `${actionKey}-EMERGENCY`}
                        onClick={(e) => {
                          e.stopPropagation();
                          bookStation(station, 'EMERGENCY');
                        }}
                      >
                        <AlertUrgentRegular /> Emergency
                      </button>
                    </div>
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
    </main>
  );
}
