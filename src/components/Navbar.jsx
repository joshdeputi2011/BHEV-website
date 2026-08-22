import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlashRegular,
  NavigationRegular,
  DismissRegular,
  PersonRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const baseLinks = [
    { to: '/', label: 'Home' },
    { to: '/discover', label: 'Discover' },
    { to: '/docs', label: 'API Docs' },
  ];

  // Only show Operator link for operator/admin roles
  const links = isAuthenticated && (user?.role === 'operator' || user?.role === 'admin')
    ? [...baseLinks, { to: '/operator', label: 'Operator' }]
    : baseLinks;

  // Add admin link for admin role
  const allLinks = isAuthenticated && user?.role === 'admin'
    ? [...links, { to: '/admin', label: 'Admin' }]
    : links;

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
          {allLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar__link ${location.pathname === l.to ? 'navbar__link--active' : ''}`}
            >
              {l.label}
            </Link>
          ))}

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
            {allLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`navbar__mobile-link ${location.pathname === l.to ? 'navbar__mobile-link--active' : ''}`}
              >
                {l.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <span className="navbar__mobile-user">
                  <PersonRegular /> {user?.name || 'User'} ({user?.role})
                </span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={logout}
                  style={{ marginTop: 8, width: '100%' }}
                >
                  <SignOutRegular /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }}>
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary btn-sm" style={{ marginTop: 8, width: '100%' }}>
                  Get Started
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
