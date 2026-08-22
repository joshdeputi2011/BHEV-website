import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  NavigationRegular,
  DismissRegular,
  PersonRegular,
  SignOutRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('uei_theme') || 'gov';
  });
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

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

  const baseLinks = [
    { to: '/', label: 'Home' },
    { to: '/discover', label: 'Discover' },
    { to: '/docs', label: 'API Docs' },
  ];

  // Only show Operator link for operator/admin roles
  const linksWithOp = isAuthenticated && (user?.role === 'operator' || user?.role === 'admin')
    ? [...baseLinks, { to: '/operator', label: 'Operator' }]
    : baseLinks;

  // Add admin link for admin role
  const allLinks = isAuthenticated && user?.role === 'admin'
    ? [...linksWithOp, { to: '/admin', label: 'Admin' }]
    : linksWithOp;

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
            {allLinks.map((l) => (
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

            {isAuthenticated ? (
              <div className="navbar__user-section">
                <span className="navbar__user-name">
                  <PersonRegular /> {user?.name?.split(' ')[0] || 'User'}
                </span>
                <button
                  className="btn-secondary btn-sm navbar__logout-btn"
                  onClick={logout}
                  id="navbar-logout"
                >
                  <SignOutRegular /> Logout
                </button>
              </div>
            ) : (
              <div className="navbar__auth-buttons">
                <Link to="/login" className="btn-secondary btn-sm">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary btn-sm navbar__cta">
                  Get Started
                </Link>
              </div>
            )}
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
              {allLinks.map((l) => (
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

              {isAuthenticated ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="navbar__mobile-user">
                    <PersonRegular /> {user?.name || 'User'} ({user?.role})
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={logout}
                    style={{ width: '100%' }}
                  >
                    <SignOutRegular /> Logout
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <Link to="/login" className="btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    Sign In
                  </Link>
                  <Link to="/signup" className="btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
