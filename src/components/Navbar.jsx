import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  NavigationRegular,
  DismissRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
} from '@fluentui/react-icons';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('uei_theme') || 'gov';
  });
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('uei_theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'gov' ? 'dark' : 'gov'));
  };

  const links = [
    { to: '/', label: 'Home' },
    { to: '/discover', label: 'Discover' },
    { to: '/docs', label: 'API Docs' },
    { to: '/operator', label: 'Operator' },
  ];

  return (
    <header className={`navbar-wrapper ${scrolled ? 'navbar-wrapper--scrolled' : ''}`}>
      <nav className="navbar">
        <div className="navbar__inner">
          <Link to="/" className="navbar__logo">
            <div className="navbar__logo-icon">
              <FlashRegular />
            </div>
            <div className="navbar__logo-group">
              <span className="navbar__logo-text">CHARGEGRID</span>
              <span className="navbar__logo-subtext">Unified EV Portal</span>
            </div>
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

            {/* Simple Day/Night Icon Toggle */}
            <button
              className="navbar__theme-btn"
              onClick={toggleTheme}
              title={theme === 'gov' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label={theme === 'gov' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'gov' ? (
                <WeatherMoonRegular className="navbar__theme-icon" />
              ) : (
                <WeatherSunnyRegular className="navbar__theme-icon navbar__theme-icon--sun" />
              )}
            </button>

            <Link to="/docs" className="btn-primary btn-sm navbar__cta">
              Get Started
            </Link>
          </div>

          <div className="navbar__actions-mobile">
            <button
              className="navbar__theme-btn navbar__theme-btn--mobile"
              onClick={toggleTheme}
              aria-label="Toggle Day/Night Mode"
            >
              {theme === 'gov' ? <WeatherMoonRegular /> : <WeatherSunnyRegular />}
            </button>

            <button
              className="navbar__hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              id="navbar-toggle"
            >
              {mobileOpen ? <DismissRegular /> : <NavigationRegular />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="navbar__mobile"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
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

              <div className="navbar__mobile-theme-row">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Appearance:</span>
                <button
                  className="navbar__theme-btn"
                  onClick={toggleTheme}
                  style={{ gap: 6, width: 'auto', padding: '6px 14px' }}
                >
                  {theme === 'gov' ? (
                    <>
                      <WeatherMoonRegular /> <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <WeatherSunnyRegular /> <span>Light Mode</span>
                    </>
                  )}
                </button>
              </div>

              <Link to="/docs" className="btn-primary btn-sm" style={{ marginTop: 10, width: '100%' }}>
                Get Started
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
