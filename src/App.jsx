import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Admin from './pages/Admin';
import Docs from './pages/Docs';
import Discover from './pages/Discover';
import Operator from './pages/Operator';
import ChargingPoint from './pages/ChargingPoint';
import Kiosk from './pages/Kiosk';
import Sessions from './pages/Sessions';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/BHEV-website">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/kiosk/:stationId" element={<Kiosk />} />
          <Route path="/operator" element={<Operator />} />
          <Route path="/charging-point/:stationId" element={<ChargingPoint />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
