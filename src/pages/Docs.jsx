import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  ShieldCheckmarkRegular,
  LockOpenRegular,
  CopyRegular,
  CheckmarkRegular,
  SearchRegular,
  FilterRegular,
  CodeRegular,
  BookRegular,
  FlashRegular,
} from '@fluentui/react-icons';
import MethodBadge from '../components/MethodBadge';
import GlowBlob from '../components/GlowBlob';
import apiEndpoints from '../data/apiEndpoints';
import '../components/GlassCard.css';
import '../components/MethodBadge.css';
import './Docs.css';

const audienceLabels = {
  developers: 'App Developers',
  cpos: 'Charge Point Operators',
};

export default function Docs() {
  const [activeSection, setActiveSection] = useState('auth');
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedPath, setCopiedPath] = useState(null);

  const sections = Object.entries(apiEndpoints);

  const filteredSections = sections.filter(([, section]) => {
    if (filter === 'all') return true;
    return section.audience.includes(filter);
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const toggleEndpoint = (key) => {
    setExpandedEndpoint(expandedEndpoint === key ? null : key);
  };

  return (
    <div className="docs">
      <GlowBlob color="blue" size={200} top="100px" right="-80px" />
      <GlowBlob color="green" size={160} bottom="20%" left="-60px" delay={3} />

      {/* Header */}
      <div className="docs__header">
        <div className="container">
          <motion.div
            className="docs__header-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="docs__header-badge">
              <CodeRegular />
              <span>API Reference v1</span>
            </div>
            <h1>URJAA API <span className="tiranga-gradient-text">Documentation</span></h1>
            <p>
              Integrate once with a CPO-neutral, normalized EV charging data platform.
              Internal governance endpoints are intentionally not public documentation.
            </p>

            {/* Base URL */}
            <div className="docs__base-url glass">
              <span className="docs__base-url-label">Base URL</span>
              <code>{import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io'}</code>
              <button
                className="docs__copy-btn"
                onClick={() => handleCopy(import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io')}
                title="Copy base URL"
              >
                {copiedPath === (import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io') ? <CheckmarkRegular /> : <CopyRegular />}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container docs__layout">
        {/* Sidebar */}
        <aside className="docs__sidebar">
          <div className="docs__sidebar-sticky">
            {/* Search */}
            <div className="docs__search input-with-icon">
              <span className="input-icon"><SearchRegular /></span>
              <input
                type="text"
                className="input-field"
                placeholder="Search endpoints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="docs-search"
              />
            </div>

            {/* Audience filter */}
            <div className="docs__filter">
              <FilterRegular />
              <div className="docs__filter-pills">
                {['all', 'developers', 'cpos'].map((f) => (
                  <button
                    key={f}
                    className={`docs__filter-pill ${filter === f ? 'docs__filter-pill--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : audienceLabels[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nav */}
            <nav className="docs__nav">
              {filteredSections.map(([key, section]) => (
                <button
                  key={key}
                  className={`docs__nav-item ${activeSection === key ? 'docs__nav-item--active' : ''}`}
                  onClick={() => {
                    setActiveSection(key);
                    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  id={`nav-${key}`}
                >
                  <BookRegular />
                  <span>{section.title}</span>
                  <span className="docs__nav-count">{section.endpoints.length}</span>
                </button>
              ))}
            </nav>

            {/* Auth info */}
            <div className="docs__auth-info glass">
              <h4><ShieldCheckmarkRegular /> Authentication</h4>
              <p>Protected endpoints require a JWT Bearer token in the <code>Authorization</code> header.</p>
              <div className="code-block" style={{ marginTop: 8, fontSize: '0.78rem' }}>
                Authorization: Bearer &lt;token&gt;
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="docs__content">
          {filteredSections.map(([sectionKey, section]) => {
            const filteredEndpoints = section.endpoints.filter((ep) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                ep.path.toLowerCase().includes(q) ||
                ep.summary.toLowerCase().includes(q) ||
                ep.method.toLowerCase().includes(q)
              );
            });

            if (filteredEndpoints.length === 0 && search) return null;

            return (
              <motion.section
                key={sectionKey}
                id={`section-${sectionKey}`}
                className="docs__section"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.4 }}
              >
                <div className="docs__section-header">
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                  <div className="docs__section-tags">
                    {section.audience.map((a) => (
                      <span key={a} className="docs__tag">{audienceLabels[a]}</span>
                    ))}
                  </div>
                </div>

                <div className="docs__endpoints">
                  {filteredEndpoints.map((ep, i) => {
                    const epKey = `${sectionKey}-${i}`;
                    const isExpanded = expandedEndpoint === epKey;

                    return (
                      <div
                        key={epKey}
                        className={`docs__endpoint glass ${isExpanded ? 'docs__endpoint--expanded' : ''}`}
                      >
                        <button
                          className="docs__endpoint-header"
                          onClick={() => toggleEndpoint(epKey)}
                          id={`endpoint-${sectionKey}-${i}`}
                        >
                          <MethodBadge method={ep.method} />
                          <code className="docs__endpoint-path">{ep.path}</code>
                          <span className="docs__endpoint-summary">{ep.summary}</span>
                          <div className="docs__endpoint-meta">
                            {ep.auth ? (
                              <span className="docs__endpoint-auth docs__endpoint-auth--required">
                                <ShieldCheckmarkRegular /> {typeof ep.auth === 'string' ? ep.auth : 'auth'}
                              </span>
                            ) : (
                              <span className="docs__endpoint-auth docs__endpoint-auth--public">
                                <LockOpenRegular /> public
                              </span>
                            )}
                            <span className="docs__endpoint-chevron">
                              {isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                            </span>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              className="docs__endpoint-body"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div className="docs__endpoint-details">
                                {ep.notes && (
                                  <div className="docs__endpoint-note">
                                    <FlashRegular /> {ep.notes}
                                  </div>
                                )}

                                {/* Request */}
                                {ep.request && (Object.keys(ep.request.body || {}).length > 0 || ep.request.query || ep.request.headers) && (
                                  <div className="docs__code-section">
                                    <div className="docs__code-label">
                                      <span>Request</span>
                                      <button
                                        className="docs__copy-btn"
                                        onClick={() => handleCopy(JSON.stringify(ep.request.body || ep.request, null, 2))}
                                        title="Copy request"
                                      >
                                        {copiedPath === JSON.stringify(ep.request.body || ep.request, null, 2) ? <CheckmarkRegular /> : <CopyRegular />}
                                      </button>
                                    </div>
                                    {ep.request.headers && (
                                      <pre className="code-block" style={{ marginBottom: 8 }}>
                                        {Object.entries(ep.request.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
                                      </pre>
                                    )}
                                    {ep.request.query && (
                                      <pre className="code-block" style={{ marginBottom: 8 }}>
                                        {`Query: ?${ep.request.query}`}
                                      </pre>
                                    )}
                                    {ep.request.body && Object.keys(ep.request.body).length > 0 && (
                                      <pre className="code-block">
                                        {JSON.stringify(ep.request.body, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                )}

                                {/* Response */}
                                {ep.response && (
                                  <div className="docs__code-section">
                                    <div className="docs__code-label">
                                      <span>Response <span className="docs__response-badge">200 OK</span></span>
                                      <button
                                        className="docs__copy-btn"
                                        onClick={() => handleCopy(JSON.stringify(ep.response, null, 2))}
                                        title="Copy response"
                                      >
                                        {copiedPath === JSON.stringify(ep.response, null, 2) ? <CheckmarkRegular /> : <CopyRegular />}
                                      </button>
                                    </div>
                                    <pre className="code-block">
                                      {JSON.stringify(ep.response, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
