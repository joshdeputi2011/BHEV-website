import { useCallback, useEffect, useState } from 'react';
import { ArrowSyncRegular, QrCodeRegular, BuildingRegular, WarningRegular } from '@fluentui/react-icons';
import AuthGate from '../components/AuthGate';
import './Operator.css';

const api = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function OperatorConsole({ token }) {
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useCallback((path, options = {}) => fetch(`${api}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } }), [token]);
  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try { const response = await request('/api/v1/operator/mock-stations'); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load simulator'); setStations(payload.data); setSelected(payload.data[0] || null); } catch (cause) { setMessage(cause.message); } finally { setLoading(false); }
  }, [request]);
  const sync = async () => { setLoading(true); try { const response = await request('/api/v1/operator/mock-stations/sync', { method: 'POST' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Sync failed'); setMessage(`Normalized ${payload.data.locations} mock stations and ${payload.data.connectors} connectors.`); await load(); } catch (cause) { setMessage(cause.message); setLoading(false); } };
  const refreshQr = useCallback(async () => { if (!selected) return; try { const response = await request(`/api/v1/operator/mock-stations/${selected.id}/dynamic-qr`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'QR unavailable'); setQr(payload.data); } catch (cause) { setMessage(cause.message); } }, [request, selected]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { refreshQr(); const timer = setInterval(refreshQr, 30_000); return () => clearInterval(timer); }, [refreshQr]);
  return <main className="operator-page container-wide">
    <header className="operator-page__header"><div><span className="discover__eyebrow"><BuildingRegular /> CPO prototype console</span><h1>Station simulator</h1><p>This screen only presents CHARGEGRID’s labelled mock CPO feed. It must be replaced with an operator-authorized OCPI or API adapter before production use.</p></div><button className="btn-primary" disabled={loading} onClick={sync}><ArrowSyncRegular /> {loading ? 'Syncing…' : 'Sync mock feed'}</button></header>
    {message && <p className="operator-page__message"><WarningRegular /> {message}</p>}
    <section className="operator-page__grid"><div className="operator-page__stations glass">{stations.map((station) => <button key={station.id} className={selected?.id === station.id ? 'operator-page__station operator-page__station--active' : 'operator-page__station'} onClick={() => setSelected(station)}><strong>{station.name}</strong><span>{station.city} · {station.availableConnectors} connector(s) available</span><small>{station.bookings?.length || 0} active booking(s)</small></button>)}</div><div className="operator-page__display glass">{selected ? <><div className="operator-page__display-head"><div><p>Station display — rotating secure token</p><h2>{selected.name}</h2></div><button className="btn-secondary btn-sm" onClick={refreshQr}>Rotate now</button></div><div className="operator-page__qr"><QrCodeRegular /><code>{qr?.token || 'Generating signed QR…'}</code></div><p className="operator-page__expiry">Expires {qr ? new Date(qr.expiresAt).toLocaleTimeString() : '—'} · changes every 30 seconds · HMAC signed</p><div className="operator-page__connectors">{selected.connectors.map((connector) => <div key={connector.id}><strong>{connector.standard}</strong><span>{connector.maxPowerKw} kW</span><em className={`discover__status discover__status--${connector.status.toLowerCase().replaceAll('_', '-')}`}>{connector.status}</em></div>)}</div></> : <p>No synced station is available.</p>}</div></section>
  </main>;
}

export default function Operator() { return <AuthGate requiredRoles={['operator', 'admin']} title="Operator access"><OperatorConsole /></AuthGate>; }
