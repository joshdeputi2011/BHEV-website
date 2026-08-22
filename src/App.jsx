import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import Docs from './pages/Docs';
import Discover from './pages/Discover';
import Operator from './pages/Operator';

export default function App() {
  return (
    <BrowserRouter basename="/BHEV-website">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/operator" element={<Operator />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </BrowserRouter>
  );
}
