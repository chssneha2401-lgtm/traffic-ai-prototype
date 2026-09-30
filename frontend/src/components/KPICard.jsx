import React from 'react';

/**
 * Reusable KPI card: small icon top-right, small gray title, big monospace
 * number colored by metric health, small subtext with real detail.
 *
 * Props: title, value, unit, subtext, icon, color, subDot (css color | null)
 */
function KPICard({ title, value, unit, subtext, icon: Icon, color = '#00e5ff', subDot = null }) {
  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4 relative">
      {Icon && (
        <div className="absolute top-4 right-4 text-ops-muted">
          <Icon size={16} />
        </div>
      )}

      <p className="text-xs text-ops-secondary mb-2">{title}</p>

      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-bold font-mono-num leading-none"
          style={{ color }}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-ops-muted">{unit}</span>}
      </div>

      {subtext && (
        <p className="mt-2 text-[11px] text-ops-muted flex items-center gap-1.5">
          {subDot && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: subDot }}
            />
          )}
          {subtext}
        </p>
      )}
    </div>
  );
}

export default KPICard;
