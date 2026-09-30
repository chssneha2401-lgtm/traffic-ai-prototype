import React from 'react';
import { ListOrdered } from 'lucide-react';
import { LANE_COLORS, SIGNAL_COLORS } from '../utils/constants';

const LANES = ['Lane_A', 'Lane_B', 'Lane_C', 'Lane_D'];

/**
 * Lane Approach Queue Status table. Remaining countdown comes ONLY from the
 * WebSocket-driven smoothed countdown passed from App/pages (never REST).
 */
function SignalTimerPanel({ liveData, countdown }) {
  if (!liveData) {
    return (
      <div className="bg-ops-card border border-ops-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-ops-primary mb-4 flex items-center gap-2">
          <ListOrdered size={15} className="text-ops-muted" />
          Lane Approach Queue Status
        </h2>
        <div className="py-10 text-center text-xs text-ops-muted">
          Waiting for live signal data...
        </div>
      </div>
    );
  }

  const { active_lane, signal_state, lane_data } = liveData;
  const remaining =
    typeof countdown === 'number' && countdown !== null
      ? countdown
      : liveData.countdown;

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ops-primary flex items-center gap-2">
          <ListOrdered size={15} className="text-ops-muted" />
          Lane Approach Queue Status
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ops-muted">Active:</span>
          <span
            className="text-xs font-bold font-mono-num px-2 py-0.5 rounded"
            style={{ color: SIGNAL_COLORS[signal_state], backgroundColor: SIGNAL_COLORS[signal_state] + '1a' }}
          >
            {active_lane?.replace('Lane_', 'Lane ')} · {signal_state}
          </span>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-ops-muted border-b border-ops-border">
            <th className="text-left font-medium py-2">Lane</th>
            <th className="text-right font-medium py-2">Queue</th>
            <th className="text-right font-medium py-2">Distance (m)</th>
            <th className="text-right font-medium py-2">Cycle (s)</th>
            <th className="text-right font-medium py-2">Remaining (s)</th>
            <th className="text-right font-medium py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {LANES.map((lane) => {
            const info = lane_data[lane] || {};
            const isActive = lane === active_lane;
            const laneColor = LANE_COLORS[lane] || '#64748b';
            const statusColor = SIGNAL_COLORS[info.status] || '#64748b';
            // Approximate meters of queue: assume ~5.5m per queued vehicle
            const meters = ((info.count || 0) * 5.5).toFixed(0);

            return (
              <tr
                key={lane}
                className={`border-b border-ops-border/50 last:border-0 ${
                  isActive ? 'nav-active-border bg-ops-cyan/5' : ''
                }`}
              >
                <td className="py-2.5">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded font-bold text-[11px] font-mono-num"
                    style={{ color: laneColor, backgroundColor: laneColor + '1a', border: `1px solid ${laneColor}55` }}
                  >
                    {lane.slice(-1)}
                  </span>
                  <span className="ml-2 text-ops-secondary">Lane {lane.slice(-1)}</span>
                </td>
                <td className="py-2.5 text-right font-mono-num text-ops-primary font-semibold">
                  {info.count || 0}
                </td>
                <td className="py-2.5 text-right font-mono-num text-ops-secondary">
                  {meters}
                </td>
                <td className="py-2.5 text-right font-mono-num text-ops-secondary">
                  {info.green_time || 0}
                </td>
                <td className="py-2.5 text-right font-mono-num font-semibold"
                    style={{ color: isActive ? SIGNAL_COLORS[signal_state] : '#64748b' }}>
                  {isActive ? remaining : '-'}
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ color: statusColor, backgroundColor: statusColor + '1a' }}
                  >
                    {info.status || 'RED'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-[10px] text-ops-muted">
        Distance is an estimate at ~5.5 m per queued vehicle · cycle values are
        the adaptive allocation for the current phase
      </p>
    </div>
  );
}

export default SignalTimerPanel;
