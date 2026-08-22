import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MailRegular,
  LockClosedRegular,
  FlashRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Login.css';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      // If user has no role set yet (still 'customer' with no onboarding), redirect to onboarding
      if (data.user?.needsOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <GlowBlob color="green" size={220} top="-100px" left="-80px" />
      <GlowBlob color="blue" size={280} bottom="-120px" right="-60px" delay={2} />

      <motion.div
        className="login-page__card glass"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="login-page__logo">
          <FlashRegular />
        </div>

        <h1 className="login-page__title">Welcome back</h1>
        <p className="login-page__subtitle">
          Sign in to your ChargeGrid account
        </p>

        {error && <div className="login-page__error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-page__form">
          <div className="input-with-icon">
            <span className="input-icon"><MailRegular /></span>
            <input
              type="email"
              className="input-field"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="login-email"
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
              id="login-password"
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn-primary login-page__submit"
            disabled={loading}
            id="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-page__footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}
