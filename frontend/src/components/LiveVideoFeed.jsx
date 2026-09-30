import React, { useState, useEffect } from 'react';
import { Video, Gauge, Plus, Siren, TrendingUp } from 'lucide-react';
import { LANE_COLORS, API_BASE_URL, VIDEO_FEED_URL } from '../utils/constants';

const LANES = ['Lane_A', 'Lane_B', 'Lane_C', 'Lane_D'];

function LiveVideoFeed() {
  const [feedStatus, setFeedStatus] = useState('connecting'); // connecting, live, error
  const [rushMsg, setRushMsg] = useState(null);
  const [emergencyMsg, setEmergencyMsg] = useState(null);
  const [emergencyLane, setEmergencyLane] = useState('Lane_C');
  const [busy, setBusy] = useState('');
  const [latency, setLatency] = useState(null);

  // Measure MJPEG latency: time to first byte of a fresh stream request
  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      const start = performance.now();
      try {
        const response = await fetch(VIDEO_FEED_URL, { method: 'GET', headers: { Range: 'bytes=0-1' } });
        await response.body.getReader().read();
        if (!cancelled) setLatency(Math.max(1, performance.now() - start).toFixed(1));
      } catch {
        if (!cancelled) setLatency(null);
      }
    };
    measure();
    const interval = setInterval(measure, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const post = async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return response.json();
  };

  const handleRush = async (lane) => {
    setBusy(lane);
    try {
      const data = await post(`${API_BASE_URL}/api/simulate-rush`, { lane, amount: 15 });
      setRushMsg(
        data.status === 'success'
          ? `Queued +${data.added} vehicles in ${data.lane.replace('_', ' ')}`
          : data.message || 'Surge injection requires Simulation mode'
      );
      setTimeout(() => setRushMsg(null), 4000);
    } catch (e) {
      console.error('Rush simulation failed:', e);
    } finally {
      setBusy('');
    }
  };

  const handleRushAll = async () => {
    setBusy('all');
    try {
      const data = await post(`${API_BASE_URL}/api/simulate-rush-all`, { amount: 20 });
      setRushMsg(
        data.status === 'success'
          ? `City surge: +${data.added_per_lane} vehicles queued in all lanes`
          : data.message || 'Surge injection requires Simulation mode'
      );
      setTimeout(() => setRushMsg(null), 4000);
    } catch (e) {
      console.error('Rush hour simulation failed:', e);
    } finally {
      setBusy('');
    }
  };

  const handleEmergency = async () => {
    setBusy('emergency');
    try {
      const data = await post(`${API_BASE_URL}/api/emergency-override`, {
        lane: emergencyLane,
        duration_sec: 30,
      });
      setEmergencyMsg(
        data.status === 'success'
          ? `${data.lane.replace('_', ' ')} forced GREEN for ${data.duration_sec}s`
          : 'Emergency override failed'
      );
      setTimeout(() => setEmergencyMsg(null), 4000);
    } catch (e) {
      console.error('Emergency override failed:', e);
      setEmergencyMsg('Emergency override failed');
      setTimeout(() => setEmergencyMsg(null), 4000);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ops-primary flex items-center gap-2">
          <Video size={15} className="text-ops-muted" />
          Live Junction Feed
        </h2>
        <span className="text-[10px] text-ops-muted">Node J5 · Sion Circle</span>
      </div>

      {/* Video frame */}
      <div className="relative bg-black rounded-md overflow-hidden border-2 border-[#0f172a] aspect-video">
        <img
          src={VIDEO_FEED_URL}
          alt="Live traffic feed"
          className="w-full h-full object-contain"
          onLoad={() => setFeedStatus('live')}
          onError={() => setFeedStatus('error')}
        />

        {feedStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-xs text-ops-muted">Connecting to MJPEG stream...</p>
          </div>
        )}
        {feedStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-1">
            <p className="text-xs text-ops-red">Stream unavailable</p>
            <p className="text-[10px] text-ops-muted">Start the backend to view the live feed</p>
          </div>
        )}

        {/* LIVE RTSP badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded">
          <span className={`w-1.5 h-1.5 rounded-full ${feedStatus === 'live' ? 'bg-ops-green animate-pulse-slow' : 'bg-ops-red'}`} />
          <span className="text-[10px] font-bold tracking-wide text-white">LIVE RTSP STREAM</span>
        </div>

        {/* Latency badge */}
        {latency && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded">
            <Gauge size={10} className="text-ops-muted" />
            <span className="text-[10px] font-mono-num text-ops-secondary">{latency} ms</span>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded">
          <span className="text-[10px] font-bold text-ops-cyan">YOLOv8</span>
        </div>
      </div>

      {/* Stream footer */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-ops-muted font-mono-num">
        <span>MJPEG · HTTP</span>
        <span>15 FPS target</span>
        <span>800 x 800 source</span>
      </div>

      {/* Judge Demo Controls */}
      <div className="mt-3 bg-ops-surface/60 rounded-md p-3 border border-ops-border">
        <p className="text-[10px] font-bold text-ops-muted uppercase tracking-wider mb-2">
          Scenario Controls (Simulation mode)
        </p>
        <div className="flex flex-wrap gap-2">
          {LANES.map((lane) => (
            <button
              key={lane}
              onClick={() => handleRush(lane)}
              disabled={busy !== ''}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-ops-card border border-ops-border hover:border-ops-cyan/50 disabled:opacity-50 rounded-md text-xs font-semibold text-ops-secondary transition-colors"
            >
              <Plus size={11} style={{ color: LANE_COLORS[lane] }} />
              Force +15 {lane.replace('Lane_', 'Lane ')}
            </button>
          ))}
          <button
            onClick={handleRushAll}
            disabled={busy !== ''}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ops-red/15 border border-ops-red/40 text-ops-red hover:bg-ops-red/25 disabled:opacity-50 rounded-md text-xs font-semibold transition-colors"
          >
            <TrendingUp size={11} />
            Simulate City Surge
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={emergencyLane}
              onChange={(e) => setEmergencyLane(e.target.value)}
              className="bg-ops-card border border-ops-border text-ops-secondary text-xs rounded-md px-2 py-1.5"
            >
              {LANES.map((lane) => (
                <option key={lane} value={lane}>{lane.replace('Lane_', 'Lane ')}</option>
              ))}
            </select>
            <button
              onClick={handleEmergency}
              disabled={busy !== ''}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ops-green/15 border border-ops-green/40 text-ops-green hover:bg-ops-green/25 disabled:opacity-50 rounded-md text-xs font-semibold transition-colors"
            >
              <Siren size={11} />
              Trigger Ambulance Green Wave
            </button>
          </div>
        </div>
        {rushMsg && <p className="mt-2 text-[11px] text-ops-amber">{rushMsg}</p>}
        {emergencyMsg && <p className="mt-2 text-[11px] text-ops-green">{emergencyMsg}</p>}
      </div>
    </div>
  );
}

export default LiveVideoFeed;
