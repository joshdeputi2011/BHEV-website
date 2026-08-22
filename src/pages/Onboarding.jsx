import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VehicleCarRegular,
  BuildingRegular,
  FlashRegular,
  MapRegular,
  CalendarRegular,
  ShieldCheckmarkRegular,
  PlugConnectedRegular,
  DataBarVerticalRegular,
  KeyRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import GlowBlob from '../components/GlowBlob';
import './Onboarding.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

const driverFeatures = [
  { icon: <MapRegular />, text: 'Find charging stations near you on the map' },
  { icon: <CalendarRegular />, text: 'Book time slots & skip the queue' },
  { icon: <FlashRegular />, text: 'Track charging sessions and costs in real-time' },
  { icon: <ShieldCheckmarkRegular />, text: 'Secure QR-based arrival verification' },
];

const operatorFeatures = [
  { icon: <PlugConnectedRegular />, text: 'Connect and manage your charging stations' },
  { icon: <DataBarVerticalRegular />, text: 'Monitor bookings, sessions & revenue' },
  { icon: <KeyRegular />, text: 'API access for third-party integrations' },
  { icon: <FlashRegular />, text: 'Dynamic QR codes for each station' },
];

export default function Onboarding() {
  const { user, updateRole, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [operatorDetails, setOperatorDetails] = useState({
    orgName: '', legalName: '', contactPhone: '', address: '', city: '', state: '', registrationNumber: '', govtApprovalNumber: ''
  });

  const handleContinue = async () => {
    if (step === 1) {
      if (!selectedRole) return;
      setStep(2);
      return;
    }

    // Step 2 — save role
    setError('');
    try {
      const roleResult = await updateRole(selectedRole);
      if (selectedRole === 'operator') {
        const missing = ['orgName', 'legalName', 'contactPhone', 'address', 'city', 'state', 'registrationNumber'].some((key) => !operatorDetails[key].trim());
        if (missing) throw new Error('Complete all required operator registration fields.');
        const res = await fetch(`${API_URL}/api/v1/operator/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${roleResult.token}` },
          body: JSON.stringify({ ...operatorDetails, contactEmail: user?.email, orgType: 'Private CPO' })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || payload.message || 'Unable to complete operator onboarding.');
      }
      navigate(selectedRole === 'operator' ? '/operator' : '/discover');
    } catch (err) {
      setError(err.message);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div className="onboarding">
      <GlowBlob color="green" size={200} top="-80px" left="-60px" />
      <GlowBlob color="blue" size={260} bottom="-100px" right="-40px" delay={2} />

      <motion.div
        className="onboarding__card glass"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Step indicator */}
        <div className="onboarding__step-indicator">
          <div className={`onboarding__step-dot ${step >= 1 ? (step > 1 ? 'onboarding__step-dot--done' : 'onboarding__step-dot--active') : ''}`} />
          <div className="onboarding__step-line" />
          <div className={`onboarding__step-dot ${step >= 2 ? 'onboarding__step-dot--active' : ''}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h1 className="onboarding__title">
                Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
              </h1>
              <p className="onboarding__subtitle">
                How will you use URJAA?
              </p>

              <div className="onboarding__roles">
                <button
                  className={`onboarding__role-card ${selectedRole === 'customer' ? 'onboarding__role-card--selected' : ''}`}
                  onClick={() => setSelectedRole('customer')}
                  id="role-driver"
                >
                  <div className="onboarding__role-icon onboarding__role-icon--driver">
                    <VehicleCarRegular />
                  </div>
                  <span className="onboarding__role-title">EV Driver</span>
                  <span className="onboarding__role-desc">
                    Find stations, book slots, and charge your electric vehicle
                  </span>
                </button>

                <button
                  className={`onboarding__role-card ${selectedRole === 'operator' ? 'onboarding__role-card--selected' : ''}`}
                  onClick={() => setSelectedRole('operator')}
                  id="role-operator"
                >
                  <div className="onboarding__role-icon onboarding__role-icon--operator">
                    <BuildingRegular />
                  </div>
                  <span className="onboarding__role-title">Station Operator</span>
                  <span className="onboarding__role-desc">
                    Connect charging stations, manage schedules, and track usage
                  </span>
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={handleContinue}
                disabled={!selectedRole}
                id="onboarding-continue"
                style={{ width: '100%' }}
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="onboarding__welcome-icon">
                <CheckmarkCircleRegular />
              </div>

              <h1 className="onboarding__title">
                {selectedRole === 'operator' ? 'Ready to connect' : 'You\'re all set'}
              </h1>
              <p className="onboarding__subtitle">
                {selectedRole === 'operator'
                  ? 'Here\'s what you can do as a Station Operator on URJAA'
                  : 'Here\'s what you can do as an EV Driver on URJAA'
                }
              </p>

              {error && <div className="onboarding__error">{error}</div>}

              <div className="onboarding__features">
                {(selectedRole === 'operator' ? operatorFeatures : driverFeatures).map((f, i) => (
                  <motion.div
                    key={i}
                    className="onboarding__feature"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                  >
                    <span className="onboarding__feature-icon">{f.icon}</span>
                    <span className="onboarding__feature-text">{f.text}</span>
                  </motion.div>
                ))}
              </div>

              {selectedRole === 'operator' && (
                <div className="onboarding__features" style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <input className="form-input" required placeholder="Operating organization name" value={operatorDetails.orgName} onChange={(e) => setOperatorDetails({ ...operatorDetails, orgName: e.target.value })} />
                  <input className="form-input" required placeholder="Legal entity name" value={operatorDetails.legalName} onChange={(e) => setOperatorDetails({ ...operatorDetails, legalName: e.target.value })} />
                  <input className="form-input" required placeholder="Contact phone" value={operatorDetails.contactPhone} onChange={(e) => setOperatorDetails({ ...operatorDetails, contactPhone: e.target.value })} />
                  <input className="form-input" required placeholder="Registered address" value={operatorDetails.address} onChange={(e) => setOperatorDetails({ ...operatorDetails, address: e.target.value })} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input className="form-input" required placeholder="City" value={operatorDetails.city} onChange={(e) => setOperatorDetails({ ...operatorDetails, city: e.target.value })} />
                    <input className="form-input" required placeholder="State" value={operatorDetails.state} onChange={(e) => setOperatorDetails({ ...operatorDetails, state: e.target.value })} />
                  </div>
                  <input className="form-input" required placeholder="Corporate registration number" value={operatorDetails.registrationNumber} onChange={(e) => setOperatorDetails({ ...operatorDetails, registrationNumber: e.target.value })} />
                  <input className="form-input" placeholder="Government approval number (optional)" value={operatorDetails.govtApprovalNumber} onChange={(e) => setOperatorDetails({ ...operatorDetails, govtApprovalNumber: e.target.value })} />
                </div>
              )}

              <div className="onboarding__actions">
                <button
                  className="btn-secondary"
                  onClick={() => setStep(1)}
                  id="onboarding-back"
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleContinue}
                  disabled={loading}
                  id="onboarding-finish"
                >
                  {loading ? 'Setting up...' : 'Get Started'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
