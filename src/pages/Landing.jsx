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
import heroImage from '../assets/chargegrid-network-hero.png';

const features = [
  {
    icon: <CalendarRegular />,
    title: 'Universal Booking',
    desc: 'Book charging slots across any CPO network through a single unified API. No more fragmented apps.',
  },
  {
    icon: <FlashRegular />,
    title: 'Real-time Sessions',
    desc: 'Live energy consumption tracking with BLE-integrated metering and automatic cost calculation.',
  },
  {
    icon: <PeopleRegular />,
    title: 'Multi-operator Support',
    desc: 'Seamlessly connect multiple Charge Point Operators under one interoperable framework.',
  },
  {
    icon: <ShieldCheckmarkRegular />,
    title: 'Secure Authentication',
    desc: 'JWT-based auth with email verification, OTP, and Google OAuth. Role-based access control built-in.',
  },
  {
    icon: <MapRegular />,
    title: 'Station Discovery',
    desc: 'Geo-aware station search with real-time availability, ratings, wait times, and connector info.',
  },
  {
    icon: <DocumentRegular />,
    title: 'Developer-first API',
    desc: 'RESTful endpoints with comprehensive documentation. Build your own EV app on top of UEI.',
  },
];

const steps = [
  { num: '01', icon: <PeopleRegular />, title: 'Register', desc: 'Sign up via email, phone OTP, or Google. Get your API token instantly.' },
  { num: '02', icon: <SearchRegular />, title: 'Find Station', desc: 'Search nearby stations with real-time availability, connector types, and tariffs.' },
  { num: '03', icon: <CheckmarkCircleRegular />, title: 'Book Slot', desc: 'Reserve a time slot with conflict detection. Receive a unique QR token for check-in.' },
  { num: '04', icon: <BatteryChargeRegular />, title: 'Charge', desc: 'Scan QR to start session. Real-time energy tracking with automatic billing.' },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="landing__hero">
        <img className="landing__hero-image" src={heroImage} alt="Electric vehicle charging network at dusk" />
        <GlowBlob color="green" size={280} top="-100px" left="-80px" />
        <GlowBlob color="blue" size={320} bottom="-120px" right="-60px" delay={2} />
        <GlowBlob color="cyan" size={160} top="40%" left="60%" delay={4} />

        <div className="container landing__hero-inner">
          <motion.div
            className="landing__hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <FlashRegular />
            <span>Unified EV Infrastructure Framework</span>
          </motion.div>

          <motion.h1
            className="landing__hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            One API for <span className="gradient-text">Every EV Charger</span> in India
          </motion.h1>

          <motion.p
            className="landing__hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            CHARGEGRID connects Charge Point Operators, EV drivers, and app developers
            through a single interoperable framework — making EV charging as
            seamless as UPI made payments.
          </motion.p>

          <motion.div
            className="landing__hero-actions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link to="/docs" className="btn-primary">
              <DocumentRegular /> API Documentation
            </Link>
            <Link to="/discover" className="btn-secondary">
              Explore stations <ArrowRightRegular />
            </Link>
          </motion.div>

          {/* Hero code preview */}
          <motion.div
            className="landing__hero-code glass"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
          >
            <div className="landing__code-header">
              <span className="landing__code-dot" style={{ background: '#FF5F56' }}></span>
              <span className="landing__code-dot" style={{ background: '#FFBD2E' }}></span>
              <span className="landing__code-dot" style={{ background: '#27C93F' }}></span>
              <span className="landing__code-label">Quick Start</span>
            </div>
            <pre className="code-block">
{`// 1. Authenticate
const res = await fetch('/auth/email/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await res.json();

// 2. Find nearby stations
const stations = await fetch('/stations/nearby?lat=12.97&lng=77.59');

// 3. Book a slot
const booking = await fetch('/bookings', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${token}\` },
  body: JSON.stringify({ stationId, slotStart, slotEnd })
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
            transition={{ duration: 0.5 }}
          >
            <h2>Built for the <span className="gradient-text">EV Ecosystem</span></h2>
            <p>Everything you need to build, manage, and scale EV charging infrastructure.</p>
          </motion.div>

          <div className="landing__features-grid">
            {features.map((f, i) => (
              <GlassCard key={i} delay={i * 0.1} className="landing__feature-card">
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
        <GlowBlob color="green" size={200} top="20%" right="-80px" delay={1} />
        <div className="container">
          <motion.div
            className="landing__section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>How It <span className="gradient-text">Works</span></h2>
            <p>From registration to charging in four simple steps.</p>
          </motion.div>

          <div className="landing__steps">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className="landing__step"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
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
              <h3>For Charge Point Operators</h3>
              <p>
                Register your charging stations, manage bookings, and stream live
                energy readings through the UEI API. Reach thousands of EV drivers
                through any UEI-connected app.
              </p>
              <ul className="landing__audience-list">
                <li><CheckmarkCircleRegular /> Station registration & management</li>
                <li><CheckmarkCircleRegular /> Real-time booking visibility</li>
                <li><CheckmarkCircleRegular /> BLE energy metering integration</li>
                <li><CheckmarkCircleRegular /> Automated billing & settlements</li>
              </ul>
              <Link to="/docs" className="btn-primary btn-sm">
                CPO Integration Guide <ArrowRightRegular />
              </Link>
            </GlassCard>

            <GlassCard className="landing__audience-card" delay={0.2}>
              <div className="landing__audience-icon dev">
                <DocumentRegular />
              </div>
              <h3>For App Developers</h3>
              <p>
                Build EV charging into your application with our RESTful API.
                Station discovery, booking, sessions, and payments — all through
                a single integration point.
              </p>
              <ul className="landing__audience-list">
                <li><CheckmarkCircleRegular /> RESTful API with JWT auth</li>
                <li><CheckmarkCircleRegular /> Station search & availability</li>
                <li><CheckmarkCircleRegular /> Booking with conflict detection</li>
                <li><CheckmarkCircleRegular /> Real-time session tracking</li>
              </ul>
              <Link to="/docs" className="btn-primary btn-sm">
                Developer Docs <ArrowRightRegular />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section landing__cta-section">
        <GlowBlob color="accent" size={250} top="-60px" left="30%" />
        <div className="container">
          <motion.div
            className="landing__cta glass"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>Ready to <span className="gradient-text">Get Started</span>?</h2>
            <p>Explore the API documentation or access the admin dashboard.</p>
            <div className="landing__cta-actions">
              <Link to="/docs" className="btn-primary">
                View API Docs <ArrowRightRegular />
              </Link>
              <Link to="/admin" className="btn-secondary">
                Admin Dashboard
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
              <div className="navbar__logo-icon" style={{ width: 32, height: 32, fontSize: '1rem' }}>
                <FlashRegular />
              </div>
              <span style={{ fontWeight: 700, letterSpacing: 1 }}>UEI</span>
            </div>
            <div className="landing__footer-links">
              <Link to="/">Home</Link>
              <Link to="/docs">API Docs</Link>
              <Link to="/admin">Admin</Link>
            </div>
            <p className="landing__footer-copy">
              © 2026 Unified EV Infrastructure. Built for SIH 2026.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
