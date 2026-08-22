import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MailRegular,
  LockClosedRegular,
  FlashRegular,
} from '@fluentui/react-icons';
import GlowBlob from './GlowBlob';
import './AuthGate.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AuthGate({ children, requiredRoles = ['admin'], title = 'Admin Login' }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('uei_admin_token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (!requiredRoles.includes(data.user?.role)) {
        throw new Error(`${requiredRoles.join(' or ')} access required`);
      }

      sessionStorage.setItem('uei_admin_token', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('uei_admin_token');
    setToken(null);
  };

  if (token) {
    return children({ token, logout: handleLogout });
  }

  return (
    <div className="auth-gate">
      <GlowBlob color="green" size={200} top="-80px" left="-60px" />
      <GlowBlob color="blue" size={260} bottom="-100px" right="-40px" delay={2} />

      <motion.div
        className="auth-gate__card glass"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-gate__logo">
          <FlashRegular />
        </div>

        <h2 className="auth-gate__title"><span className="tiranga-gradient-text">{title}</span></h2>
        <p className="auth-gate__subtitle">
          Sign in with your admin credentials to access the dashboard.
        </p>

        {error && <div className="auth-gate__error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-gate__form">
          <div className="input-with-icon">
            <span className="input-icon"><MailRegular /></span>
            <input
              type="email"
              className="input-field"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="admin-email"
              autoComplete="email"
            />
          </div>

          <div className="input-with-icon">
            <span className="input-icon"><LockClosedRegular /></span>
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              id="admin-password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-gate__submit"
            disabled={loading}
            id="admin-login-btn"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
