import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NavigationRegular,
  SearchRegular,
  FlashRegular,
  LocationRegular,
  ArrowResetRegular,
  GlobeRegular,
  VehicleCarRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular
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

  // 1. Auto-detect user's location on initial mount
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
        console.info('Automatic location detection skipped or waiting for manual prompt:', err.message);
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
        // Try local static BEE dataset first for instant 29k station load
        const basePath = import.meta.env.BASE_URL || '/';
        const staticJsonUrl = `${basePath}data/bee-stations.json`.replace(/\/+/g, '/');
        const staticMetaUrl = `${basePath}data/source-meta.json`.replace(/\/+/g, '/');

        let stationsData = null;
        let metaData = null;

        try {
          const res = await fetch(staticJsonUrl);
          if (res.ok) {
            const data = await res.json();
            stationsData = data.stations || data;
            metaData = data.meta;
          }
        } catch (e) {
          console.warn('Local static JSON fetch failed, trying API fallback', e);
        }

        // If local static json was not available, try API
        if (!stationsData) {
          try {
            const res = await fetch(`${api}/api/v1/stations?limit=100`);
            if (res.ok) {
              const payload = await res.json();
              stationsData = payload.data || [];
            }
          } catch (e) {
            console.warn('API fetch failed', e);
          }
        }

        // Try to fetch meta if not yet loaded
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
          // Precompute search string for instantaneous lookup
          const processed = stationsData.map((s) => {
            const connectors = Array.isArray(s.connectors)
              ? s.connectors.map((c) => c.standard || c)
              : Array.isArray(s.connector_types)
                ? s.connector_types
                : Array.isArray(s.connector_categories)
                  ? s.connector_categories
                  : [];

            return {
              ...s,
              latitude: Number(s.latitude),
              longitude: Number(s.longitude),
              maxPowerKw: Number(s.maxPowerKw || s.max_power_kw || 0),
              connectorsList: connectors,
              _search: [
                s.name,
                s.cpo || s.operator?.name,
                s.location || s.address,
                s.city,
                s.district,
                s.state,
                s.ownership,
                ...connectors
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            };
          });

          setAllStations(processed);

          if (metaData) {
            setMeta(metaData);
          } else {
            // Compute fallback metadata
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

  // Filter logic
  const filteredStations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const queryWords = q ? q.split(/\s+/).filter(Boolean) : [];
    const minPower = Number(selectedPower);
    const rad = Number(selectedRadius);

    return allStations
      .map((s) => {
        let dist = null;
        if (userLocation) {
          dist = haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude);
        }
        return { ...s, _distance: dist };
      })
      .filter((s) => {
        // Multi-word keyword matching
        if (queryWords.length > 0) {
          const matchAll = queryWords.every((word) => s._search.includes(word));
          if (!matchAll) return false;
        }
        if (selectedState && s.state !== selectedState) return false;
        if (
          selectedConnector &&
          !s.connectorsList.some((c) =>
            String(c).toLowerCase().includes(selectedConnector.toLowerCase())
          )
        )
          return false;
        if (selectedOwnership && s.ownership !== selectedOwnership) return false;
        if (minPower > 0 && s.maxPowerKw < minPower) return false;
        // Radius filter only restricts if explicitly enabled (> 0)
        if (userLocation && rad > 0 && s._distance != null && s._distance > rad) return false;
        return true;
      })
      .sort((a, b) => {
        if (userLocation && a._distance != null && b._distance != null) {
          return a._distance - b._distance;
        }
        return 0;
      });
  }, [
    allStations,
    query,
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
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : 'Current+Location';
    const dest = `${station.latitude},${station.longitude}`;
    window.open(
      `https://www.mappls.com/direction?source=${origin}&destination=${dest}`,
      '_blank',
      'noopener,noreferrer'
    );
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
              <FlashRegular /> CHARGEGRID • NATIONAL EV DISCOVERY MAP
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
                placeholder="Search city, station name, CPO, district, address (e.g. Tata Power, Mumbai, Ather)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="discover__search-clear" onClick={() => setQuery('')}>
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
              <span>{userLocation ? 'Nearby Visible' : 'Matches Visible'}</span>
            </div>
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
                {loading ? 'Loading…' : `${fmt(filteredStations.length)} STATIONS FOUND`}
              </span>
              <h2>{userLocation ? 'Nearest Stations to You' : 'Charging Points'}</h2>
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
              <p>No charging stations match your current filter criteria.</p>
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
                        <NavigationRegular /> Navigate
                      </button>
                    </footer>
                  </article>
                );
              })}

              {filteredStations.length > 150 && (
                <div className="discover__list-footer-note">
                  Showing top 150 of {fmt(filteredStations.length)} stations. Use search or filters to narrow down your area.
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
