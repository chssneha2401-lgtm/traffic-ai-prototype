import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Network, TrendingDown, AlertTriangle, Activity, ChevronRight } from 'lucide-react';
import KPICard from '../components/KPICard';
import NetworkRadar from '../components/NetworkRadar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSignalData } from '../hooks/useSignalData';
import { API_BASE_URL } from '../utils/constants';

const LANES = ['Lane_A', 'Lane_B', 'Lane_C', 'Lane_D'];
const LANE_SHORT = { Lane_A: 'A', Lane_B: 'B', Lane_C: 'C', Lane_D: 'D' };
const CONGESTION_COLOR = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };

function DashboardPage() {
  const { isConnected, liveData } = useWebSocket();
  const { signalData } = useSignalData();
  const [junctions, setJunctions] = useState([]);

  // Real junction data from the backend (8 config junctions + live J5)
  useEffect(() => {
    const fetchJunctions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/congestion-map`);
        const data = await response.json();
        setJunctions(data.junctions || []);
      } catch (error) {
        // Backend offline - table stays empty
      }
    };
    fetchJunctions();
    const interval = setInterval(fetchJunctions, 10000);
    return () => clearInterval(interval);
  }, []);

  // Top congested junctions by real vehicle count
  const topJunctions = [...junctions]
    .sort((a, b) => (b.total_count || 0) - (a.total_count || 0))
    .slice(0, 5);

  // Live alert feed derived from actual lane congestion + connection state
  const alerts = [];
  if (!isConnected) {
    alerts.push({
      id: 'conn', severity: 'HIGH', time: null,
      title: 'Backend connection lost', detail: 'Live data unavailable',
    });
  }
  if (liveData) {
    LANES.forEach((lane) => {
      const info = liveData.lane_data?.[lane];
      if (info?.congestion === 'HIGH') {
        alerts.push({
          id: lane,
          severity: 'HIGH',
          time: liveData.timestamp,
          title: `${lane.replace('_', ' ')} congestion`,
          detail: `${info.count} vehicles queued, green extended to ${info.green_time}s`,
        });
      }
    });
  }

  const activeAlerts = alerts.length;
  const highLanes = liveData
    ? LANES.filter((l) => liveData.lane_data?.[l]?.congestion === 'HIGH').length
    : 0;

  const kpiColor = {
    cyan: '#00e5ff', green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  };

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Junctions Monitored"
          value={junctions.length || '0'}
          subtext={junctions.length ? `${junctions.length} configured · 1 live junction` : 'waiting for backend'}
          icon={Network}
          color={kpiColor.cyan}
          subDot={junctions.length ? kpiColor.green : kpiColor.amber}
        />
        <KPICard
          title="Wait Time Reduction"
          value="20-25"
          unit="%"
          subtext="Adaptive vs fixed-time target"
          icon={TrendingDown}
          color={kpiColor.green}
          subDot={kpiColor.green}
        />
        <KPICard
          title="Active Alerts"
          value={activeAlerts}
          unit={activeAlerts === 1 ? 'lane' : 'lanes'}
          subtext={isConnected ? 'HIGH congestion thresholds breached' : 'backend offline'}
          icon={AlertTriangle}
          color={activeAlerts > 0 ? kpiColor.red : kpiColor.green}
          subDot={activeAlerts > 0 ? kpiColor.red : kpiColor.green}
        />
        <KPICard
          title="Edge System Uptime"
          value="100"
          unit="%"
          subtext="1 node · single-junction prototype"
          icon={Activity}
          color={kpiColor.green}
          subDot={kpiColor.green}
        />
      </div>

      {/* City network congestion radar */}
      <NetworkRadar junctions={junctions} liveData={liveData} />

      {/* Bottom split: congested junctions table + live alert feed */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Congested Junctions */}
        <div className="bg-ops-card border border-ops-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ops-primary">Top Congested Junctions</h3>
            <Link to="/city-map" className="text-xs text-ops-cyan hover:underline flex items-center gap-0.5">
              City map <ChevronRight size={12} />
            </Link>
          </div>
          {topJunctions.length === 0 ? (
            <p className="text-xs text-ops-muted py-6 text-center">No junction data available</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ops-muted border-b border-ops-border">
                  <th className="text-left font-medium py-2">Junction</th>
                  <th className="text-left font-medium py-2">Status</th>
                  <th className="text-right font-medium py-2">Vehicles</th>
                </tr>
              </thead>
              <tbody>
                {topJunctions.map((j) => (
                  <tr key={j.id} className="border-b border-ops-border/50 last:border-0">
                    <td className="py-2">
                      <span className="font-mono-num text-ops-muted mr-2">{j.id}</span>
                      {j.name}
                      {j.is_live && (
                        <span className="ml-2 text-[9px] font-bold px-1 py-0.5 rounded bg-ops-cyan/10 text-ops-cyan">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          color: CONGESTION_COLOR[j.status?.toUpperCase()] || '#64748b',
                          backgroundColor: (CONGESTION_COLOR[j.status?.toUpperCase()] || '#64748b') + '1a',
                        }}
                      >
                        {(j.status || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono-num text-ops-primary">
                      {j.total_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Live Incident & Alert Feed */}
        <div className="bg-ops-card border border-ops-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-ops-primary mb-3">Live Incident &amp; Alert Feed</h3>
          {alerts.length === 0 ? (
            <p className="text-xs text-ops-muted py-6 text-center">
              No active incidents - all lanes below HIGH threshold
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 bg-ops-surface/60 rounded-md p-2.5">
                  <span
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: a.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ops-primary">{a.title}</p>
                    <p className="text-[11px] text-ops-muted truncate">{a.detail}</p>
                    {a.time && <p className="text-[10px] text-ops-muted font-mono-num mt-0.5">{a.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {liveData && (
            <p className="text-[10px] text-ops-muted mt-3">
              Derived from live lane congestion · {highLanes} of 4 lanes at HIGH
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
