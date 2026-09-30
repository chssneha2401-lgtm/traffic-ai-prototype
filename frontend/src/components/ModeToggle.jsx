import React, { useState, useEffect } from 'react';
import { Video, MonitorPlay } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

/**
 * Self-contained engine mode switcher (AI Simulation / CCTV Video).
 * Loads the current mode on mount and posts changes to /api/set-mode.
 */
function ModeToggle() {
  const [mode, setMode] = useState('simulation');

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/current-mode`);
        const data = await response.json();
        if (data.mode) setMode(data.mode);
      } catch (error) {
        // Backend offline - keep default
      }
    };
    fetchMode();
  }, []);

  const switchMode = async (newMode) => {
    const previous = mode;
    setMode(newMode);
    try {
      const response = await fetch(`${API_BASE_URL}/api/set-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await response.json();
      if (data.status !== 'success') setMode(previous);
    } catch (error) {
      console.error('Error switching mode:', error);
      setMode(previous);
    }
  };

  return (
    <div className="flex items-center bg-ops-card border border-ops-border rounded-md p-0.5">
      <button
        onClick={() => switchMode('simulation')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          mode === 'simulation'
            ? 'bg-ops-cyan/15 text-ops-cyan'
            : 'text-ops-muted hover:text-ops-secondary'
        }`}
      >
        <MonitorPlay size={12} />
        Simulation
      </button>
      <button
        onClick={() => switchMode('video')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          mode === 'video'
            ? 'bg-ops-cyan/15 text-ops-cyan'
            : 'text-ops-muted hover:text-ops-secondary'
        }`}
      >
        <Video size={12} />
        CCTV
      </button>
    </div>
  );
}

export default ModeToggle;
