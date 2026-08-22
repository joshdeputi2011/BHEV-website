import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationRegular, SearchRegular, FlashRegular, FilterRegular } from '@fluentui/react-icons';
import MapplsStationMap from '../components/MapplsStationMap';
import './Discover.css';

const api = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const statusClass = (status) => status.toLowerCase().replaceAll('_', '-');

export default function Discover() {
  const [stations, setStations] = useState([]);
  const [query, setQuery] = useState('');
  const [connector, setConnector] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (connector) params.set('connector', connector);
      const response = await fetch(`${api}/api/v1/stations?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load stations');
      setStations(payload.data); setSelected((current) => current && payload.data.find((station) => station.id === current.id));
    } catch (cause) { setError(cause.message); } finally { setLoading(false); }
  }, [connector, query]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const connectorOptions = useMemo(() => [...new Set(stations.flatMap((station) => station.connectors.map((item) => item.standard)))].sort(), [stations]);
  const navigate = (station) => {
    const origin = 'Current+Location';
    const destination = `${station.latitude},${station.longitude}`;
    window.open(`https://www.mappls.com/direction?source=${origin}&destination=${destination}`, '_blank', 'noopener,noreferrer');
  };

  return <main className="discover">
    <section className="discover__intro container-wide">
      <span className="discover__eyebrow"><FlashRegular /> CHARGEGRID live discovery</span>
      <h1>One map. <span className="tiranga-gradient-text">Every connected network.</span></h1>
      <p>Stations are read from the normalized CHARGEGRID API. Prototype stations are visibly marked until an operator authorizes a production OCPI/API integration.</p>
      <div className="discover__controls glass">
        <label className="input-with-icon"><span className="input-icon"><SearchRegular /></span><input className="input-field" placeholder="Search city, station or address" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="discover__select"><FilterRegular /><select value={connector} onChange={(event) => setConnector(event.target.value)}><option value="">All connectors</option>{connectorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
    </section>
    <section className="discover__content container-wide">
      <div className="discover__map-panel"><MapplsStationMap stations={stations} selectedStation={selected} onSelect={setSelected} /></div>
      <aside className="discover__list glass" aria-live="polite">
        <header><div><span>{loading ? 'Loading stations…' : `${stations.length} stations`}</span><h2>Available to you</h2></div><button className="btn-secondary btn-sm" onClick={load}>Refresh</button></header>
        {error && <p className="discover__error">{error}</p>}
        {!loading && !error && stations.map((station) => <article key={station.id} className={`discover__station ${selected?.id === station.id ? 'discover__station--selected' : ''}`} onClick={() => setSelected(station)}>
          <div className="discover__station-top"><div><p className="discover__operator">{station.operator.isMock ? 'Prototype CPO feed' : station.operator.name}</p><h3>{station.name}</h3><p>{station.address}, {station.city}</p></div><strong>{station.reliability.score}<small>/100</small></strong></div>
          <div className="discover__badges">{station.connectors.map((item) => <span key={item.id} className={`discover__status discover__status--${statusClass(item.status)}`}>{item.standard} · {item.maxPowerKw} kW</span>)}</div>
          <footer><span>{station.availableConnectors} available connector(s)</span><button className="btn-primary btn-sm" onClick={(event) => { event.stopPropagation(); navigate(station); }}><NavigationRegular /> Navigate</button></footer>
        </article>)}
      </aside>
    </section>
  </main>;
}
