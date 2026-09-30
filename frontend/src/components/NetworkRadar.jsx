import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_COLOR = {
  FREE: '#10b981',
  MODERATE: '#f59e0b',
  CONGESTED: '#ef4444',
  LIVE: '#00e5ff',
};

// Node layout: live J5 at center, others in a ring around it
const NODE_LAYOUT = {
  J5: { x: 400, y: 180 },           // Sion Circle (live)
  J1: { x: 130, y: 70 },            // Andheri West
  J2: { x: 300, y: 45 },            // BKC
  J3: { x: 560, y: 60 },            // Dadar TT
  J4: { x: 680, y: 150 },           // Nariman Point
  J6: { x: 620, y: 285 },           // Chembur
  J7: { x: 330, y: 305 },           // Kurla West
  J8: { x: 150, y: 270 },           // Ghatkopar
};

// Edges (traffic flow connections between adjacent junctions)
const EDGES = [
  ['J1', 'J2'], ['J2', 'J5'], ['J2', 'J3'], ['J3', 'J4'],
  ['J5', 'J3'], ['J5', 'J6'], ['J5', 'J7'], ['J7', 'J6'],
  ['J7', 'J8'], ['J8', 'J1'], ['J8', 'J5'],
];

/**
 * City Network Congestion Radar: dark SVG graph with colored junction nodes
 * (green/amber/red, cyan for the live node) and flow lines between them.
 * Nodes derive their color and size from REAL backend congestion data.
 */
function NetworkRadar({ junctions = [] }) {
  const byId = Object.fromEntries(junctions.map((j) => [j.id, j]));

  const nodeColor = (j) => {
    if (!j) return '#64748b';
    if (j.is_live) return STATUS_COLOR.LIVE;
    return STATUS_COLOR[j.status?.toUpperCase()] || '#64748b';
  };

  const nodeRadius = (j) => {
    if (!j) return 6;
    if (j.is_live) return 13;
    const c = j.total_count || 0;
    if (c >= 70) return 11;
    if (c >= 40) return 9;
    return 7;
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ops-primary">City Network Congestion Radar</h3>
        <div className="flex items-center gap-3 text-[10px] text-ops-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#10b981'}}/>Free</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#f59e0b'}}/>Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#ef4444'}}/>Congested</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#00e5ff'}}/>Live node</span>
        </div>
      </div>

      {junctions.length === 0 ? (
        <div className="h-[340px] flex items-center justify-center text-xs text-ops-muted">
          Waiting for junction data from backend
        </div>
      ) : (
        <svg viewBox="0 0 800 340" className="w-full h-[340px]">
          {/* Flow lines */}
          {EDGES.map(([a, b]) => {
            const na = NODE_LAYOUT[a];
            const nb = NODE_LAYOUT[b];
            if (!na || !nb) return null;
            const ja = byId[a];
            const jb = byId[b];
            // Line color blends the two endpoint states (worst wins)
            const rank = { FREE: 0, MODERATE: 1, CONGESTED: 2 };
            const worst = Math.max(
              rank[ja?.status?.toUpperCase()] ?? 0,
              rank[jb?.status?.toUpperCase()] ?? 0
            );
            const lineColor = ['#1e3a5f', '#7c5a1e', '#5f1e1e'][worst];
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={lineColor} strokeWidth={1.5}
              />
            );
          })}

          {/* Junction nodes */}
          {junctions.map((j) => {
            const pos = NODE_LAYOUT[j.id];
            if (!pos) return null;
            const color = nodeColor(j);
            const r = nodeRadius(j);
            return (
              <g key={j.id}>
                {j.is_live && (
                  <circle cx={pos.x} cy={pos.y} r={r + 8} fill="none" stroke={color}
                          strokeWidth={1} opacity={0.4} className="animate-pulse-slow" />
                )}
                <circle cx={pos.x} cy={pos.y} r={r} fill={color} fillOpacity={0.85}
                        stroke={color} strokeWidth={2} />
                <text x={pos.x} y={pos.y - r - 6} textAnchor="middle"
                      fill="#94a3b8" fontSize={10} fontWeight={600}>
                  {j.id}
                </text>
                <text x={pos.x} y={pos.y + r + 13} textAnchor="middle"
                      fill="#64748b" fontSize={9}>
                  {j.is_live ? `${j.total_count ?? 0} live` : `${j.total_count ?? 0} veh`}
                </text>
              </g>
            );
          })}

          {/* Flow note */}
          <text x={400} y={325} textAnchor="middle" fill="#64748b" fontSize={9}>
            Node color reflects real-time junction congestion · line brightness reflects corridor load
          </text>
        </svg>
      )}

      <p className="text-[10px] text-ops-muted mt-2">
        Live node J5 (Sion Circle) streams real counts from the adaptive engine ·
        remaining junctions are configuration data · <Link to="/city-map" className="text-ops-cyan hover:underline">open geographic map</Link>
      </p>
    </div>
  );
}

export default NetworkRadar;
