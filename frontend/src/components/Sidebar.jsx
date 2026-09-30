import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  ScanText, 
  Route, 
  Map, 
  BarChart2, 
  ShieldCheck, 
  Ambulance, 
  Zap, 
  Cpu 
} from 'lucide-react';

function Sidebar() {
  const triggerScenario = async (tool, lane = 'Lane_B') => {
    try {
      if (tool === 'ambulance') {
        await fetch('http://localhost:8000/api/emergency-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lane, duration_sec: 30 })
        });
      } else if (tool === 'surge') {
        await fetch('http://localhost:8000/api/simulate-rush-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ add_count: 20 })
        });
      }
    } catch (err) {
      console.error('Scenario trigger error:', err);
    }
  };

  return (
    <aside className="w-60 bg-[#0a0f1e] border-r border-[#1e293b] flex flex-col justify-between select-none h-screen sticky top-0 font-sans">
      <div>
        {/* BRAND LOGO */}
        <div className="p-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#00e5ff]/10 rounded border border-[#00e5ff]/30 text-[#00e5ff]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">SignalVision</h1>
              <span className="text-[10px] text-[#94a3b8] font-mono tracking-wider">SIH 2026 PROTOTYPE</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: CONTROL CENTER */}
        <div className="p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] mb-2 px-2">
            Control Center
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview Dashboard</span>
            </NavLink>

            <NavLink
              to="/live"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <Video className="w-4 h-4" />
              <span>Live Junction View</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] ml-auto animate-pulse" />
            </NavLink>

            {/* ⭐ ANPR MENU ITEM */}
            <NavLink
              to="/anpr"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <ScanText className="w-4 h-4 text-[#00e5ff]" />
              <span className="font-semibold text-white">ANPR License Recognition</span>
            </NavLink>

            {/* ⭐ TRAJECTORY MENU ITEM */}
            <NavLink
              to="/trajectory"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <Route className="w-4 h-4 text-[#00e5ff]" />
              <span className="font-semibold text-white">Trajectory Tracking</span>
            </NavLink>

            <NavLink
              to="/map"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <Map className="w-4 h-4" />
              <span>City Congestion Map</span>
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics & Impact</span>
            </NavLink>

            <NavLink
              to="/system"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#0f172a] text-[#00e5ff] border-l-2 border-[#00e5ff]' : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]/50'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4" />
              <span>System & Fail-Safe</span>
            </NavLink>
          </nav>
        </div>

        {/* SECTION 2: DEMO SCENARIO TOOLS */}
        <div className="p-3 border-t border-[#1e293b]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] mb-2 px-2">
            TOC Scenario Tools
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => triggerScenario('ambulance')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 rounded text-xs text-[#ef4444] transition-colors font-medium"
            >
              <span className="flex items-center gap-2">
                <Ambulance className="w-3.5 h-3.5" />
                Trigger Ambulance
              </span>
              <span className="text-[9px] font-mono bg-[#ef4444]/20 px-1 rounded">Green-Wave</span>
            </button>

            <button
              onClick={() => triggerScenario('surge')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 border border-[#f59e0b]/30 rounded text-xs text-[#f59e0b] transition-colors font-medium"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Simulate Surge (+20)
              </span>
              <span className="text-[9px] font-mono bg-[#f59e0b]/20 px-1 rounded">Rush</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM STATUS FOOTER */}
      <div className="p-3 border-t border-[#1e293b] bg-[#0f172a]/50 text-[10px] font-mono text-[#64748b] space-y-1">
        <div className="flex justify-between">
          <span>Engine:</span>
          <span className="text-[#10b981]">YOLOv8 Adaptive</span>
        </div>
        <div className="flex justify-between">
          <span>Live Node:</span>
          <span className="text-[#f1f5f9]">Sion Circle (J5)</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;