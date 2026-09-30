import React, { useState, useEffect, useRef } from 'react';
import { Route, Trash2, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft } from 'lucide-react';
import { API_BASE_URL, LANE_COLORS } from '../utils/constants';

const DIR_ICON = {
  N: ArrowUp, S: ArrowDown, E: ArrowRight, W: ArrowLeft,
  NE: ArrowUpRight, NW: ArrowUpLeft, SE: ArrowDownRight, SW: ArrowDownLeft,
};

/**
 * Mini canvas showing recent vehicle position trails. Accepts the real
 * centroid stream when the tracker is live; DEMO data otherwise.
 */
function TrailCanvas({ vehicles }) {
  const canvasRef = useRef(null);
  const trailHistory = useRef({}); // id -> [points]

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Persist trails: push latest positions per vehicle id
    vehicles.forEach((v) => {
      if (!v.centroid) return;
      const key = String(v.id);
      if (!trailHistory.current[key]) trailHistory.current[key] = [];
      const pts = trailHistory.current[key];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== v.centroid[0] || last[1] !== v.centroid[1]) {
        pts.push([v.centroid[0], v.centroid[1]]);
        if (pts.length > 30) pts.shift();
      }
    });

    // Prune trails for vehicles no longer present
    const active = new Set(vehicles.map((v) => String(v.id)));
    Object.keys(trailHistory.current).forEach((k) => {
      if (!active.has(k)) delete trailHistory.current[k];
    });

    // Draw
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((canvas.width / 4) * i, 0);
      ctx.lineTo((canvas.width / 4) * i, canvas.height);
      ctx.moveTo(0, (canvas.height / 4) * i);
      ctx.lineTo(canvas.width, (canvas.height / 4) * i);
      ctx.stroke();
    }

    Object.entries(trailHistory.current).forEach(([id, pts]) => {
      if (pts.length < 2) return;
      const color = LANE_COLORS[`Lane_${'ABCD'[Number(id) % 4]}`] || '#00e5ff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.stroke();
      // Current position dot
      const [x, y] = pts[pts.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`#${id}`, x + 5, y - 4);
    });
  }, [vehicles]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={270}
      className="w-full rounded border border-ops-border bg-black"
    />
  );
}

function TrajectoryTab() {
  const [trackingData, setTrackingData] = useState([]);
  const [dataSource, setDataSource] = useState(null); // 'live_tracker' | 'demo_data'
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('tracking_enabled') === 'true');
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [showTrails, setShowTrails] = useState(true);

  useEffect(() => {
    localStorage.setItem('tracking_enabled', isEnabled.toString());
  }, [isEnabled]);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tracking-data`);
      const data = await response.json();
      setTrackingData(data.vehicles || []);
      setDataSource(data.source || null);
      setHasLoadedData(true);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      fetchTrackingData();
      const interval = setInterval(fetchTrackingData, 2000);
      return () => clearInterval(interval);
    }
  }, [isEnabled]);

  const resetTrails = () => {
    // Force remount of the canvas to clear trails
    setShowTrails(false);
    setTimeout(() => setShowTrails(true), 50);
  };

  const getSpeedColor = (speed) => {
    if (speed > 5) return '#ef4444';
    if (speed > 3) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-semibold text-ops-primary flex items-center gap-2">
          <Route size={16} className="text-ops-muted" />
          Vehicle Trajectory Analysis
          {dataSource && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                color: dataSource === 'live_tracker' ? '#10b981' : '#f59e0b',
                backgroundColor: dataSource === 'live_tracker' ? '#10b98120' : '#f59e0b20',
              }}
            >
              {dataSource === 'live_tracker' ? 'LIVE TRACKER' : 'DEMO DATA'}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ops-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Enable tracking
          </label>
          {showTrails && (
            <button
              onClick={resetTrails}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ops-surface border border-ops-border text-ops-secondary hover:text-ops-primary rounded-md text-xs"
            >
              <Trash2 size={12} />
              Clear Trails
            </button>
          )}
        </div>
      </div>

      {!isEnabled && !hasLoadedData ? (
        <div className="py-12 text-center">
          <p className="text-sm text-ops-secondary">Trajectory tracking is disabled</p>
          <p className="text-xs text-ops-muted mt-1">Enable tracking to monitor vehicle movement paths</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-ops-surface/60 rounded-md p-3 text-center">
              <p className="text-2xl font-bold font-mono-num text-ops-cyan">{trackingData.length}</p>
              <p className="text-[11px] text-ops-muted">Active Vehicles</p>
            </div>
            <div className="bg-ops-surface/60 rounded-md p-3 text-center">
              <p className="text-2xl font-bold font-mono-num text-ops-green">
                {trackingData.filter((v) => v.speed > 0).length}
              </p>
              <p className="text-[11px] text-ops-muted">Moving</p>
            </div>
            <div className="bg-ops-surface/60 rounded-md p-3 text-center">
              <p className="text-2xl font-bold font-mono-num text-ops-amber">
                {trackingData.filter((v) => v.speed === 0).length}
              </p>
              <p className="text-[11px] text-ops-muted">Stopped</p>
            </div>
            <div className="bg-ops-surface/60 rounded-md p-3 text-center">
              <p className="text-2xl font-bold font-mono-num text-ops-red">
                {trackingData.filter((v) => v.speed > 5).length}
              </p>
              <p className="text-[11px] text-ops-muted">High Speed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trail visualization */}
            {showTrails && (
              <div>
                <p className="text-[10px] font-bold text-ops-muted uppercase tracking-wider mb-2">
                  Path Trails ({dataSource === 'live_tracker' ? 'live centroids' : 'demo positions'})
                </p>
                <TrailCanvas vehicles={trackingData} />
                <p className="text-[10px] text-ops-muted mt-2">
                  Trail color cycles by vehicle ID · coordinates are raw frame pixels
                </p>
              </div>
            )}

            {/* Tracking table */}
            <div className="bg-ops-surface/40 rounded-md overflow-hidden border border-ops-border">
              <table className="w-full text-xs">
                <thead className="bg-ops-surface">
                  <tr className="text-ops-muted">
                    <th className="px-3 py-2.5 text-left font-medium">ID</th>
                    <th className="px-3 py-2.5 text-left font-medium">Direction</th>
                    <th className="px-3 py-2.5 text-left font-medium">Speed</th>
                    <th className="px-3 py-2.5 text-left font-medium">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3 py-8 text-center text-ops-muted">
                        {isEnabled ? 'No vehicles being tracked' : 'Tracking disabled'}
                      </td>
                    </tr>
                  ) : (
                    trackingData.map((vehicle, index) => (
                      <tr key={index} className="border-t border-ops-border/50 hover:bg-ops-card/50">
                        <td className="px-3 py-2.5 font-mono-num font-bold text-ops-cyan">
                          #{vehicle.id ?? index + 1}
                        </td>
                        <td className="px-3 py-2.5 text-ops-secondary">
                          <span className="inline-flex items-center gap-1">
                            {DIR_ICON[vehicle.direction] &&
                              React.createElement(DIR_ICON[vehicle.direction], { size: 11 })}
                            {vehicle.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono-num font-bold" style={{ color: getSpeedColor(vehicle.speed) }}>
                          {(vehicle.speed ?? 0).toFixed(1)} px/f
                        </td>
                        <td className="px-3 py-2.5 font-mono-num text-[10px] text-ops-muted">
                          ({vehicle.centroid?.[0] ?? 0}, {vehicle.centroid?.[1] ?? 0})
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts */}
          <div className="mt-4 space-y-2">
            {trackingData.filter((v) => v.speed > 5).length > 0 && (
              <div className="bg-ops-red/10 border border-ops-red/40 rounded-md p-2.5">
                <p className="text-xs text-ops-red">
                  {trackingData.filter((v) => v.speed > 5).length} vehicle(s) above 5 px/frame
                </p>
              </div>
            )}
            {trackingData.length > 0 && trackingData.filter((v) => v.speed > 0).length === 0 && (
              <div className="bg-ops-green/10 border border-ops-green/40 rounded-md p-2.5">
                <p className="text-xs text-ops-green">
                  All tracked vehicles stationary - consistent with a red phase
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TrajectoryTab;
