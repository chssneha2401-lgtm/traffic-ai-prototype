import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from 'recharts';
import { GitCompareArrows } from 'lucide-react';

function GreenTimeChart({ signalData }) {
  const comparison = signalData?.comparison;

  const chartData = comparison
    ? Object.entries(comparison).map(([lane, data]) => ({
        lane: lane.replace('Lane_', 'Lane '),
        fixed: data.fixed_time,
        adaptive: data.adaptive_time,
        improvement: data.improvement,
      }))
    : [];

  const avgImprovement = chartData.length
    ? chartData.reduce((s, d) => s + d.improvement, 0) / chartData.length
    : 0;

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ops-primary flex items-center gap-2">
          <GitCompareArrows size={15} className="text-ops-muted" />
          Green Time Allocation: Fixed Timer vs Adaptive AI
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-ops-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#64748b]" /> Fixed Timer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-ops-cyan" /> Adaptive AI
          </span>
        </div>
      </div>

      {!comparison ? (
        <div className="h-72 flex items-center justify-center text-xs text-ops-muted">
          Loading comparison data from backend...
        </div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="lane"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  width={40}
                  label={{
                    value: 'Green Time (seconds)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#64748b', fontSize: 11 },
                  }}
                />
                <Tooltip
                  cursor={{ fill: '#0f172a' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                  itemStyle={{ color: '#94a3b8' }}
                  formatter={(value, name, entry) => {
                    if (name === 'Adaptive AI') {
                      const imp = entry?.payload?.improvement ?? 0;
                      return [`${value}s (${imp >= 0 ? '+' : ''}${imp.toFixed(1)}% vs fixed)`, name];
                    }
                    return [`${value}s`, name];
                  }}
                />
                <Bar dataKey="fixed" name="Fixed Timer" fill="#64748b" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="fixed" position="top" style={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                </Bar>
                <Bar dataKey="adaptive" name="Adaptive AI" fill="#00e5ff" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="adaptive" position="top" style={{ fill: '#00e5ff', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-lane summary */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            {chartData.map((d) => (
              <div key={d.lane} className="bg-ops-surface/60 rounded-md p-2.5 text-center">
                <p className="text-[11px] text-ops-muted">{d.lane}</p>
                <p
                  className="text-sm font-bold font-mono-num"
                  style={{ color: d.improvement >= 0 ? '#10b981' : '#f59e0b' }}
                >
                  {d.improvement >= 0 ? '+' : ''}{d.improvement.toFixed(1)}%
                </p>
                <p className="text-[10px] text-ops-muted">vs fixed</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-ops-muted">
            Single live junction, measured from the current adaptive cycle.
            At the observed cycle length this reallocation equals roughly{' '}
            <span className="font-mono-num text-ops-secondary">
              {((avgImprovement / 100) * 0.6).toFixed(1)} hours/day
            </span>{' '}
            per junction; citywide totals scale linearly and are estimates.
          </p>
        </>
      )}
    </div>
  );
}

export default GreenTimeChart;
