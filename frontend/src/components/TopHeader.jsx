import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu, Clock, Bell, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

const PAGE_TITLES = {
  '/': 'Operations Control Center · Citywide Overview',
  '/live': 'Operations Control Center · Live Junction View',
  '/map': 'City Network GIS · Dynamic Congestion Topography',
  '/analytics': 'Citywide Analytics & Environmental Impact',
  '/system': 'Hardware Node Infrastructure · Fail-Safe Interlocks',
  '/privacy': 'Privacy Policy & Data Security',
  '/terms': 'Terms & Conditions',
  '/about': 'About SignalVision'
};

function TopHeader({ liveData, isConnected }) {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate active alerts cleanly without mutating const
  const baseAlerts = liveData && liveData.lane_data ?
    Object.values(liveData.lane_data).filter((l) => l.congestion === 'HIGH').length : 0;
  const activeAlerts = baseAlerts + (!isConnected ? 1 : 0);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Operations Control Center · Citywide Overview';

  return (
    <header className="h-14 bg-[#0a0f1e] border-b border-[#1e293b] px-6 flex items-center justify-between font-sans select-none sticky top-0 z-30">
      {/* Left: Page Title Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#94a3b8] font-medium tracking-wide">
          {pageTitle}
        </span>
      </div>

      {/* Right: Engine Status, IST Clock, Ticking, Alerts, Settings */}
      <div className="flex items-center gap-4 text-xs font-mono">
        {/* Engine Mode */}
        <div className="flex items-center gap-1.5 bg-[#0f172a] px-2.5 py-1 rounded border border-[#1e293b] text-[#00e5ff]">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-semibold">Engine: ADAPTIVE DENSITY</span>
        </div>

        {/* Live IST Clock */}
        <div className="flex items-center gap-1.5 text-[#f1f5f9] bg-[#0f172a] px-2.5 py-1 rounded border border-[#1e293b]">
          <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span>{timeStr || '12:00:00 IST'}</span>
        </div>

        {/* Live Ticking Indicator */}
        <div className="flex items-center gap-1.5 text-[#10b981] bg-[#0f172a] px-2.5 py-1 rounded border border-[#1e293b]">
          <span className={`w-2 h-2 rounded-full bg-[#10b981] ${isConnected ? 'animate-ping' : ''}`} />
          <span>{isConnected ? 'Live Ticking' : 'Offline'}</span>
        </div>

        {/* Alert Count Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold ${
          activeAlerts > 0 ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]' : 'bg-[#0f172a] border-[#1e293b] text-[#94a3b8]'
        }`}>
          <Bell className="w-3.5 h-3.5" />
          <span>{activeAlerts} Alerts</span>
        </div>

        {/* Settings Modal Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-[#94a3b8] hover:text-[#00e5ff] rounded transition-colors"
          title="Configure Cycle Parameters"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </header>
  );
}

export default TopHeader;