import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

/**
 * System Health Panel: real runtime metrics from GET /api/runtime-metrics,
 * polled every 3 seconds. All numbers monospace.
 */
function RuntimeMetricsCard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/runtime-metrics`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setMetrics(data);
      } catch (error) {
        // Backend offline - keep last known values
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const fmtUptime = (sec) => {
    if (sec == null) return '-';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const rows = metrics ? [
    ['Engine version', 'YOLOv8n · ultralytics 8.0'],
    ['Engine mode', metrics.mode === 'video' ? 'CCTV video' : 'AI simulation'],
    ['Uptime', fmtUptime(metrics.backend_uptime_sec)],
    ['Frames processed', metrics.frames_processed?.toLocaleString() ?? '-'],
    ['Stream FPS', metrics.fps != null ? metrics.fps.toFixed(1) : '-'],
    ['YOLO latency', metrics.detection_latency_ms ? `${metrics.detection_latency_ms} ms/frame` : 'n/a (sim mode)'],
    ['ANPR engine', metrics.anpr_mode === 'easyocr' ? 'EasyOCR' : metrics.anpr_mode === 'mock' ? 'Mock fallback' : '-'],
    ['Vehicles on road', String(metrics.total_vehicles ?? '-')],
  ] : [];

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ops-primary flex items-center gap-2">
          <HeartPulse size={15} className={metrics ? 'text-ops-green' : 'text-ops-muted'} />
          System Health Panel
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${metrics ? 'bg-ops-green animate-pulse-slow' : 'bg-ops-red'}`} />
          <span className="text-[10px] text-ops-muted">{metrics ? 'Engine responding' : 'Backend offline'}</span>
        </div>
      </div>

      {!metrics ? (
        <p className="text-xs text-ops-muted py-4 text-center">Connecting to backend...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-xs border-b border-ops-border/40 py-1.5">
              <span className="text-ops-muted">{label}</span>
              <span className="font-mono-num text-ops-primary">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RuntimeMetricsCard;
