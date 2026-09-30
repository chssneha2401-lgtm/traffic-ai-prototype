import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Footer from './components/Footer';

// Pages
import DashboardPage from './pages/DashboardPage';
import LiveJunctionPage from './pages/LiveJunctionPage';
import CityMapPage from './pages/CityMapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SystemPage from './pages/SystemPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import About from './pages/About';

// Tab Components
import ANPRTab from './components/ANPRTab';
import TrajectoryTab from './components/TrajectoryTab';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const { isConnected, liveData } = useWebSocket();

  return (
    <Router>
      <div className="flex min-h-screen bg-[#0a0f1e] text-[#f1f5f9] font-sans">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader liveData={liveData} isConnected={isConnected} />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<DashboardPage liveData={liveData} isConnected={isConnected} />} />
              <Route path="/live" element={<LiveJunctionPage liveData={liveData} isConnected={isConnected} />} />
              
              {/* ⭐ ANPR PAGE ROUTE */}
              <Route path="/anpr" element={
                <div className="p-6">
                  <ANPRTab />
                </div>
              } />

              {/* ⭐ TRAJECTORY PAGE ROUTE */}
              <Route path="/trajectory" element={
                <div className="p-6">
                  <TrajectoryTab />
                </div>
              } />

              <Route path="/map" element={<CityMapPage liveData={liveData} />} />
              <Route path="/analytics" element={<AnalyticsPage liveData={liveData} />} />
              <Route path="/system" element={<SystemPage liveData={liveData} />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>
    </Router>
  );
}