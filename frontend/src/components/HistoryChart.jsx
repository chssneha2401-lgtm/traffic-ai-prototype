import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { LANE_COLORS, API_BASE_URL } from '../utils/constants';

/**
 * Real-time Vehicle Count Trends (60s): one smooth monotone line per lane,
 * live-updating from the backend rolling history buffer.
 */
function HistoryChart() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/history`);
        if (!response.ok) return;
        const data = await response.json();
        // Normalize: live buffer uses "t", initial fallback uses "time"
        const normalized = (data.history || []).map((row) => ({
          ...row,
          t: row.t || row.time,
        }));
        if (!cancelled) setHistory(normalized);
      } catch (error) {
        // Backend offline - keep last data
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ops-primary flex items-center gap-2">
          <Activity size={15} className="text-ops-muted" />
          Real-time Vehicle Count Trends (60s)
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-ops-muted">
          {Object.entries(LANE_COLORS).map(([lane, color]) => (
            <span key={lane} className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-sm" style={{ backgroundColor: color }} />
              {lane.replace('Lane_', 'Lane ')}
            </span>
          ))}
        </div>
      </div>

      {history.length < 2 ? (
        <div className="h-64 flex items-center justify-center text-xs text-ops-muted">
          Collecting history data... (backend records one sample per second)
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="t"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                width={36}
                label={{
                  value: 'Vehicles',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#64748b', fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ display: 'none' }} />
              {Object.entries(LANE_COLORS).map(([lane, color]) => (
                <Line
                  key={lane}
                  type="monotone"
                  dataKey={lane}
                  name={lane.replace('Lane_', 'Lane ')}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default HistoryChart;
