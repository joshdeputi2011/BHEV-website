import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DismissRegular,
  ArrowRightRegular,
  ArrowLeftRegular,
  CheckmarkCircleRegular,
  MapRegular,
  DocumentRegular,
  BuildingRegular,
  ShieldCheckmarkRegular,
  WeatherSunnyRegular,
  FlashRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import './GuideModal.css';

const steps = [
  {
    stepNumber: '01',
    title: 'Welcome & Network Overview',
    tag: 'Home • /',
    path: '/',
    icon: <FlashRegular />,
    heading: 'Understanding URJAA & UEI',
    description:
      'URJAA is India’s open, interoperable Unified EV Infrastructure framework. Just like UPI unified digital payments across banks, UEI unifies EV discovery, booking, and charging across all Charge Point Operators (CPOs).',
    highlights: [
      'Learn about the open UEI reservation standard.',
      'Explore core features for drivers, CPOs, and app developers.',
      'View the quickstart code sample for instant integration.',
    ],
    actionLabel: 'Go to Home',
  },
  {
    stepNumber: '02',
    title: 'Live Station Discovery',
    tag: 'Discover • /discover',
    path: '/discover',
    icon: <MapRegular />,
    heading: 'Search, Filter & Navigate to Chargers',
    description:
      'The Discover tab provides a normalized interactive map and list of EV stations across India, complete with live connector telemetry.',
    highlights: [
      'Search by city, station name, or locality in the search bar.',
      'Filter by connector standard (CCS2, CHAdeMO, Type 2, GB/T).',
      'Check station reliability scores (out of 100) and available plugs.',
      'Click "Navigate" to open GPS directions directly in Mappls Maps.',
    ],
    actionLabel: 'Open Discover Map',
  },
  {
    stepNumber: '03',
    title: 'Developer API Reference',
    tag: 'API Docs • /docs',
    path: '/docs',
    icon: <DocumentRegular />,
    heading: 'Integrate with the Unified EV API',
    description:
      'Explore public RESTful specifications for station discovery, conflict-safe slot bookings, and JWT authentication.',
    highlights: [
      'Filter endpoints by audience (App Developers vs CPOs).',
      'Test normalized endpoints for nearby stations & tariffs.',
      'Inspect JSON request schemas, headers, and 200 OK sample responses.',
      'One-click copy for endpoint URLs, payloads, and Base URL.',
    ],
    actionLabel: 'View API Docs',
  },
  {
    stepNumber: '04',
    title: 'Touchscreen Kiosk Simulator',
    tag: 'Kiosk • /kiosk',
    path: '/kiosk',
    icon: <FlashRegular />,
    heading: 'Physical Station Kiosk Experience',
    description:
      'Experience how drivers interact with an on-ground charging station kiosk — from slot selection and RFID/QR check-in to live charging telemetry.',
    highlights: [
      'Simulate the physical hardware terminal of an EV charger.',
      'Test plug-in, charge rate (kW), battery percentage, and energy delivered.',
      'Complete mock UPI payment and print digital receipts.',
    ],
    actionLabel: 'Try Kiosk Simulator',
  },
  {
    stepNumber: '05',
    title: 'CPO Simulator Console',
    tag: 'Operator • /operator',
    path: '/operator',
    icon: <BuildingRegular />,
    heading: 'Test Charge Point Operator Workflows',
    description:
      'Designed for Charge Point Operators to simulate station feeds and verify arriving EV drivers with rotating dynamic HMAC tokens.',
    highlights: [
      'Sync and normalize mock CPO charging stations.',
      'Inspect live rotating dynamic QR codes that change every 30 seconds.',
      'Monitor active connector wattage, standards, and charging states.',
      'Simulates driver check-in before production OCPI onboarding.',
    ],
    actionLabel: 'Open Simulator',
  },
  {
    stepNumber: '06',
    title: 'Admin Governance Portal',
    tag: 'Admin • /admin',
    path: '/admin',
    icon: <ShieldCheckmarkRegular />,
    heading: 'Network Metrics & Registry Control',
    description:
      'Secure governance console for network operators and platform administrators to monitor users, stations, and reservations.',
    highlights: [
      'Sign in with admin credentials to access system telemetry.',
      'Audit registered users, verification states, and role assignments.',
      'Inspect station networks and review serialized reservation logs.',
    ],
    actionLabel: 'Go to Admin',
  },
  {
    stepNumber: '07',
    title: 'Dual Theme Customization',
    tag: 'Appearance',
    path: '/',
    icon: <WeatherSunnyRegular />,
    heading: 'Switch Between Gov & Developer Modes',
    description:
      'Customize your visual experience anytime using the Day/Night toggle button in the top navigation bar.',
    highlights: [
      'Indian Gov Mode (Light): Warm white surfaces, Saffron highlights, and high-contrast styling.',
      'Developer Obsidian Mode (Dark): Deep slate dark mode with emerald precision accents.',
      'Preferences are saved automatically in your browser.',
    ],
    actionLabel: 'Explore Platform',
  },
];

export default function GuideModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCurrentStep(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="guide-modal__backdrop" onClick={onClose}>
        <motion.div
          className="guide-modal__content"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
        >
          {/* Header */}
          <div className="guide-modal__header">
            <div className="guide-modal__header-left">
              <span className="guide-modal__badge">
                <span className="guide-modal__badge-dot"></span>
                <span>Interactive Platform Guide</span>
              </span>
              <h2 id="guide-modal-title" className="guide-modal__main-title">
                How to Navigate <span className="tiranga-gradient-text">URJAA</span>
              </h2>
            </div>
            <button
              className="guide-modal__close-btn"
              onClick={onClose}
              aria-label="Close guide"
            >
              <DismissRegular />
            </button>
          </div>

          {/* Stepper Tabs Bar */}
          <div className="guide-modal__stepper">
            {steps.map((s, idx) => (
              <button
                key={idx}
                className={`guide-modal__step-pill ${idx === currentStep ? 'guide-modal__step-pill--active' : ''} ${idx < currentStep ? 'guide-modal__step-pill--completed' : ''}`}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}: ${s.title}`}
              >
                <span className="step-pill__num">{s.stepNumber}</span>
                <span className="step-pill__label">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Step Body */}
          <div className="guide-modal__body">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                className="guide-modal__step-panel"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="guide-step__top">
                  <div className="guide-step__icon-box">
                    {step.icon}
                  </div>
                  <div className="guide-step__titles">
                    <span className="guide-step__tag">{step.tag}</span>
                    <h3 className="guide-step__heading">{step.heading}</h3>
                  </div>
                </div>

                <p className="guide-step__description">{step.description}</p>

                <div className="guide-step__highlights-box">
                  <span className="guide-step__highlights-label">Key Actions & Features:</span>
                  <ul className="guide-step__highlights-list">
                    {step.highlights.map((item, i) => (
                      <li key={i}>
                        <CheckmarkCircleRegular className="guide-check-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="guide-modal__footer">
            <div className="guide-modal__counter">
              <span>Step <strong>{currentStep + 1}</strong> of {steps.length}</span>
            </div>

            <div className="guide-modal__actions">
              <Link
                to={step.path}
                onClick={onClose}
                className="btn-secondary btn-sm guide-modal__action-link"
              >
                <OpenRegular /> {step.actionLabel}
              </Link>

              {currentStep > 0 && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  <ArrowLeftRegular /> Previous
                </button>
              )}

              {currentStep < steps.length - 1 ? (
                <button
                  className="btn-primary btn-sm"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                >
                  Next Step <ArrowRightRegular />
                </button>
              ) : (
                <button
                  className="btn-primary btn-sm"
                  onClick={onClose}
                >
                  Get Started <CheckmarkCircleRegular />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
