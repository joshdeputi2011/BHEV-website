import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PersonRegular,
  MailRegular,
  LockClosedRegular,
  ShieldCheckmarkRegular,
  FlashRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Signup.css';

export default function Signup() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await signup(name, email, password);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-page">
      <GlowBlob color="green" size={240} top="-120px" right="-60px" />
      <GlowBlob color="blue" size={200} bottom="-80px" left="-80px" delay={2} />

      <motion.div
        className="signup-page__card glass"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="signup-page__logo">
          <FlashRegular />
        </div>

        <h1 className="signup-page__title">Create account</h1>
        <p className="signup-page__subtitle">
          Join ChargeGrid — India's unified EV charging network
        </p>

        {error && <div className="signup-page__error">{error}</div>}

        <form onSubmit={handleSubmit} className="signup-page__form">
          <div className="input-with-icon">
            <span className="input-icon"><PersonRegular /></span>
            <input
              type="text"
              className="input-field"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              id="signup-name"
              autoComplete="name"
            />
          </div>

          <div className="input-with-icon">
            <span className="input-icon"><MailRegular /></span>
            <input
              type="email"
              className="input-field"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="signup-email"
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
              id="signup-password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <p className="signup-page__password-hint">Min. 8 characters</p>

          <div className="input-with-icon">
            <span className="input-icon"><ShieldCheckmarkRegular /></span>
            <input
              type="password"
              className="input-field"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              id="signup-confirm-password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn-primary signup-page__submit"
            disabled={loading}
            id="signup-submit"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="signup-page__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
