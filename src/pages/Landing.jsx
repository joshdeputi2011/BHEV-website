import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlashRegular,
  CalendarRegular,
  MapRegular,
  PeopleRegular,
  ShieldCheckmarkRegular,
  DocumentRegular,
  ArrowRightRegular,
  PlugConnectedRegular,
  SearchRegular,
  CheckmarkCircleRegular,
  BatteryChargeRegular,
} from '@fluentui/react-icons';
import GlassCard from '../components/GlassCard';
import GlowBlob from '../components/GlowBlob';
import '../components/GlassCard.css';
import './Landing.css';
import heroImage from '../assets/urjaa-network-hero.png';

const features = [
  {
    icon: <CalendarRegular />,
    title: 'Universal Reservation Protocol',
    desc: 'Idempotent, conflict-safe booking across all connected CPO networks through one single interoperable API standard.',
  },
  {
    icon: <FlashRegular />,
    title: 'Live Energy Metering',
    desc: 'Real-time session tracking with smart metering, transparent tariffs, and automatic digital billing settlements.',
  },
  {
    icon: <PeopleRegular />,
    title: 'Multi-Operator Interoperability',
    desc: 'Unifies public and private Charge Point Operators under the Unified EV Infrastructure (UEI) open standard.',
  },
  {
    icon: <ShieldCheckmarkRegular />,
    title: 'Secure National Auth',
    desc: 'Cryptographically signed QR tokens, role-based access control, and secure driver verification architecture.',
  },
  {
    icon: <MapRegular />,
    title: 'Real-time Station Discovery',
    desc: 'Geo-aware search with live connector availability, power ratings, tariffs, and navigation integration.',
  },
  {
    icon: <DocumentRegular />,
    title: 'Open Developer SDK & APIs',
    desc: 'RESTful endpoints with standardized JSON schemas. Build navigation, fleet, and consumer apps on top of UEI.',
  },
];

const steps = [
  { num: '01', icon: <PeopleRegular />, title: 'Register Account', desc: 'Sign up securely with verified credentials to generate client API tokens.' },
  { num: '02', icon: <SearchRegular />, title: 'Discover Stations', desc: 'Search normalized nearby stations with real-time connector availability.' },
  { num: '03', icon: <CheckmarkCircleRegular />, title: 'Reserve Slot', desc: 'Lock in conflict-free charging slots with instant cryptographic confirmation.' },
  { num: '04', icon: <BatteryChargeRegular />, title: 'Plug & Charge', desc: 'Scan the station dynamic QR to initiate charging with live telemetry.' },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="landing__hero">
        <img className="landing__hero-image" src={heroImage} alt="Electric vehicle charging network in India" />
        <GlowBlob color="green" size={280} top="-80px" left="-60px" />
        <GlowBlob color="blue" size={320} bottom="-100px" right="-40px" delay={2} />

        <div className="container landing__hero-inner">
          <motion.div
            className="landing__hero-badge"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <span className="landing__hero-badge-flag">🇮🇳</span>
            <span>National Unified EV Infrastructure Framework • UEI</span>
          </motion.div>

          <motion.h1
            className="landing__hero-title"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            One National Protocol for <span className="tiranga-gradient-text">Every EV Charger</span> in India
          </motion.h1>

          <motion.p
            className="landing__hero-subtitle"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            URJAA connects Charge Point Operators, EV drivers, and enterprise developers
            through an open interoperable framework — powering seamless national EV mobility,
            just like UPI revolutionized digital payments.
          </motion.p>

          <motion.div
            className="landing__hero-actions"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <Link to="/docs" className="btn-primary">
              <DocumentRegular /> API Documentation
            </Link>
            <Link to="/discover" className="btn-secondary">
              Find Stations <ArrowRightRegular />
            </Link>
          </motion.div>

          {/* Hero code preview (Developer Workbench) */}
          <motion.div
            className="landing__hero-code"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <div className="landing__code-header">
              <span className="landing__code-dot" style={{ background: '#FF5F56' }}></span>
              <span className="landing__code-dot" style={{ background: '#FFBD2E' }}></span>
              <span className="landing__code-dot" style={{ background: '#27C93F' }}></span>
              <span className="landing__code-label">Unified API Quickstart</span>
            </div>
            <pre className="code-block">
{`// 1. Authenticate driver or developer client
const auth = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await auth.json();

// 2. Discover normalized stations nearby
const stations = await fetch('/api/v1/stations/nearby?lat=12.9716&lng=77.5946&radiusKm=10');

// 3. Reserve conflict-safe connector slot
const booking = await fetch('/api/v1/bookings', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${token}\` },
  body: JSON.stringify({ connectorId, slotStart, slotEnd, idempotencyKey })
});`}
            </pre>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section" id="features">
        <div className="container">
          <motion.div
            className="landing__section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2>Architected for the <span className="tiranga-gradient-text">National EV Grid</span></h2>
            <p>Standardized specifications, zero vendor lock-in, and interoperable protocol rails.</p>
          </motion.div>

          <div className="landing__features-grid">
            {features.map((f, i) => (
              <GlassCard key={i} delay={i * 0.08} className="landing__feature-card">
                <div className="landing__feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section landing__how-section">
        <div className="container">
          <motion.div
            className="landing__section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2>How the <span className="tiranga-gradient-text">Network Operates</span></h2>
            <p>From driver discovery to energy settlement in four standardized steps.</p>
          </motion.div>

          <div className="landing__steps">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className="landing__step"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="landing__step-num">{s.num}</div>
                <div className="landing__step-icon">{s.icon}</div>
                <div className="landing__step-content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < steps.length - 1 && <div className="landing__step-connector" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For CPOs & Developers ── */}
      <section className="section">
        <div className="container">
          <div className="landing__audience-grid">
            <GlassCard className="landing__audience-card" delay={0.1}>
              <div className="landing__audience-icon cpo">
                <PlugConnectedRegular />
              </div>
              <h3>For Charge Point Operators (CPOs)</h3>
              <p>
                Register your network chargers, broadcast real-time availability, and receive
                standardized bookings across multiple consumer mobility applications.
              </p>
              <ul className="landing__audience-list">
                <li><CheckmarkCircleRegular /> Normalized CPO station registration</li>
                <li><CheckmarkCircleRegular /> Real-time connector availability telemetry</li>
                <li><CheckmarkCircleRegular /> Dynamic HMAC arrival verification</li>
                <li><CheckmarkCircleRegular /> Standardized settlement rails</li>
              </ul>
              <Link to="/docs" className="btn-primary btn-sm">
                CPO Integration Guide <ArrowRightRegular />
              </Link>
            </GlassCard>

            <GlassCard className="landing__audience-card" delay={0.15}>
              <div className="landing__audience-icon dev">
                <DocumentRegular />
              </div>
              <h3>For App Developers & Fleet Platforms</h3>
              <p>
                Embed national charging station discovery, real-time connector booking, and
                charging sessions into your app via one unified RESTful API contract.
              </p>
              <ul className="landing__audience-list">
                <li><CheckmarkCircleRegular /> Single API for all Indian CPOs</li>
                <li><CheckmarkCircleRegular /> Geo-aware radius & connector search</li>
                <li><CheckmarkCircleRegular /> Idempotent slot reservations</li>
                <li><CheckmarkCircleRegular /> OpenAPI 3.0 specifications</li>
              </ul>
              <Link to="/docs" className="btn-primary btn-sm">
                Developer API Docs <ArrowRightRegular />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section landing__cta-section">
        <div className="container">
          <motion.div
            className="landing__cta"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2>Ready to Connect to <span className="tiranga-gradient-text">URJAA</span>?</h2>
            <p>Explore the unified API documentation or access the operator simulator console.</p>
            <div className="landing__cta-actions">
              <Link to="/docs" className="btn-primary">
                Explore API Reference <ArrowRightRegular />
              </Link>
              <Link to="/operator" className="btn-secondary">
                Operator Simulator
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing__footer">
        <div className="container">
          <div className="landing__footer-inner">
            <div className="landing__footer-brand">
              <div className="navbar__logo-icon" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}>
                <img src="/urjaa.svg" alt="URJAA Logo" className="navbar__logo-img" width="28" height="28" />
              </div>
              <span style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: '1rem' }}>URJAA • UEI</span>
            </div>
            <div className="landing__footer-links">
              <Link to="/">Home</Link>
              <Link to="/discover">Discover</Link>
              <Link to="/docs">API Docs</Link>
              <Link to="/operator">Operator</Link>
              <Link to="/admin">Admin</Link>
            </div>
            <p className="landing__footer-copy">
              © 2026 Unified EV Infrastructure (UEI) • Government of India Initiative • Built for Smart India Hackathon 2026.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
