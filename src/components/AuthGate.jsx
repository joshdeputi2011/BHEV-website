import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthGate.css';

export default function AuthGate({ children, requiredRoles = ['admin'], title = 'Admin Access' }) {
  const { isAuthenticated, user, token, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__card glass" style={{ textAlign: 'center' }}>
          <h2 className="auth-gate__title">Access Denied</h2>
          <p className="auth-gate__subtitle">
            {requiredRoles.join(' or ')} access required. Your role: {user?.role}
          </p>
          <button className="btn-secondary" onClick={logout} style={{ marginTop: '16px' }}>Logout</button>
        </div>
      </div>
    );
  }

  return typeof children === 'function'
    ? children({ token, logout })
    : children;
}
