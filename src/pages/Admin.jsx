import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PeopleRegular,
  BuildingRegular,
  CalendarRegular,
  ArrowSyncRegular,
  SignOutRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import AuthGate from '../components/AuthGate';
import DataTable from '../components/DataTable';
import GlowBlob from '../components/GlowBlob';
import { API_URL } from '../utils/apiConfig';
import '../components/DataTable.css';
import './Admin.css';

const tabs = [
  { key: 'users', label: 'Users', icon: <PeopleRegular /> },
  { key: 'stations', label: 'Stations', icon: <BuildingRegular /> },
  { key: 'bookings', label: 'Bookings', icon: <CalendarRegular /> },
];

const userColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'role', label: 'Role', render: (v) => <span className={`admin__role admin__role--${v}`}>{v}</span> },
  { key: 'emailVerified', label: 'Verified', render: (v) => v ? '✓' : '✗' },
];

const stationColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'operator', label: 'Operator' },
  { key: 'lat', label: 'Lat' },
  { key: 'lng', label: 'Lng' },
  { key: 'rating', label: 'Rating' },
  { key: 'status', label: 'Status', render: (v) => <span className={`admin__status admin__status--${v}`}>{v}</span> },
];

const bookingColumns = [
  { key: 'id', label: 'ID' },
  { key: 'userId', label: 'User ID' },
  { key: 'stationId', label: 'Station ID' },
  { key: 'slotStart', label: 'Start', render: (v) => v ? new Date(v).toLocaleString() : '—' },
  { key: 'slotEnd', label: 'End', render: (v) => v ? new Date(v).toLocaleString() : '—' },
  { key: 'status', label: 'Status', render: (v) => <span className={`admin__status admin__status--${v}`}>{v}</span> },
];

function Dashboard({ token, logout }) {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState({ users: [], stations: [], bookings: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/api/${tab}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch ${tab}`);
      const json = await res.json();
      setData((prev) => ({ ...prev, [tab]: json }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const columnsMap = { users: userColumns, stations: stationColumns, bookings: bookingColumns };

  const stats = [
    { label: 'Users', value: data.users.length, icon: <PeopleRegular />, color: 'green' },
    { label: 'Stations', value: data.stations.length, icon: <BuildingRegular />, color: 'blue' },
    { label: 'Bookings', value: data.bookings.length, icon: <CalendarRegular />, color: 'cyan' },
  ];

  // Preload all stats
  useEffect(() => {
    ['users', 'stations', 'bookings'].forEach((t) => fetchData(t));
  }, [fetchData]);

  return (
    <div className="admin">
      <GlowBlob color="green" size={180} top="-60px" left="-60px" />

      {/* Mobile sidebar toggle */}
      <button
        className="admin__sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
        id="sidebar-toggle"
      >
        <ChevronRightRegular />
      </button>

      {/* Sidebar */}
      <aside className={`admin__sidebar glass ${sidebarOpen ? 'admin__sidebar--open' : ''}`}>
        <div className="admin__sidebar-header">
          <h3>Dashboard</h3>
        </div>
        <nav className="admin__sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`admin__sidebar-item ${activeTab === t.key ? 'admin__sidebar-item--active' : ''}`}
              onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
              id={`tab-${t.key}`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <button className="admin__sidebar-item admin__logout" onClick={logout} id="admin-logout">
          <SignOutRegular />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="admin__main">
        {/* Stats */}
        <div className="admin__stats">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className={`admin__stat glass`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`admin__stat-icon admin__stat-icon--${s.color}`}>
                {s.icon}
              </div>
              <div>
                <div className="admin__stat-value">{s.value}</div>
                <div className="admin__stat-label">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Table header */}
        <div className="admin__table-header">
          <h2>Admin <span className="tiranga-gradient-text">{tabs.find((t) => t.key === activeTab)?.label}</span> Console</h2>
          <button
            className="btn-secondary btn-sm"
            onClick={() => fetchData(activeTab)}
            disabled={loading}
            id="refresh-data"
          >
            <ArrowSyncRegular /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="admin__error">{error}</div>}

        {/* Data table */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DataTable
            columns={columnsMap[activeTab]}
            data={data[activeTab]}
          />
        </motion.div>
      </main>
    </div>
  );
}

export default function Admin() {
  return (
    <AuthGate>
      {({ token, logout }) => <Dashboard token={token} logout={logout} />}
    </AuthGate>
  );
}
