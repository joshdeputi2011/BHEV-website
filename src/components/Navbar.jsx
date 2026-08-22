import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  NavigationRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/discover', label: 'Discover' },
    { to: '/docs', label: 'API Docs' },
    { to: '/operator', label: 'Operator' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          <div className="navbar__logo-icon">
            <FlashRegular />
          </div>
          <span className="navbar__logo-text">CHARGEGRID</span>
        </Link>

        <div className="navbar__links">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar__link ${location.pathname === l.to ? 'navbar__link--active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/docs" className="btn-primary btn-sm navbar__cta">
            Get Started
          </Link>
        </div>

        <button
          className="navbar__hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          id="navbar-toggle"
        >
          {mobileOpen ? <DismissRegular /> : <NavigationRegular />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="navbar__mobile"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`navbar__mobile-link ${location.pathname === l.to ? 'navbar__mobile-link--active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
            <Link to="/docs" className="btn-primary btn-sm" style={{ marginTop: 8, width: '100%' }}>
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
