import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LiveVideoFeed from '../components/LiveVideoFeed';
import SignalTimerPanel from '../components/SignalTimerPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSmoothCountdown } from '../hooks/useSmoothCountdown';
import { API_BASE_URL } from '../utils/constants';

/**
 * Live Junction View: real-time MJPEG feed with YOLO annotations next to the
 * lane queue status panel. Sidebar scenario tools land here with ?trigger=
 * (ambulance|surge) and auto-fire their action once the page is live.
 */
function LiveJunctionPage() {
  const { isConnected, liveData } = useWebSocket();
  const countdown = useSmoothCountdown(liveData);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const trigger = searchParams.get('trigger');
    if (!trigger) return;

    const fire = async () => {
      try {
        if (trigger === 'ambulance') {
          await fetch(`${API_BASE_URL}/api/emergency-override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lane: 'Lane_C', duration_sec: 30 }),
          });
        } else if (trigger === 'surge') {
          await fetch(`${API_BASE_URL}/api/simulate-rush-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 30 }),
          });
        }
      } catch (error) {
        console.error('Scenario trigger failed:', error);
      } finally {
        // Clear the param so a page refresh does not re-fire the action
        searchParams.delete('trigger');
        setSearchParams(searchParams, { replace: true });
      }
    };
    fire();
  }, [searchParams, setSearchParams]);

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <LiveVideoFeed />
        <SignalTimerPanel liveData={liveData} countdown={countdown} />
      </div>

      <div className="mt-4 bg-ops-card border border-ops-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-ops-primary mb-2">Junction Context</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-ops-muted">Node</p>
            <p className="text-ops-primary font-semibold">J5 · Sion Circle</p>
          </div>
          <div>
            <p className="text-ops-muted">Detection</p>
            <p className="text-ops-primary font-semibold">YOLOv8n · 4 classes</p>
          </div>
          <div>
            <p className="text-ops-muted">Streaming</p>
            <p className="text-ops-primary font-semibold">MJPEG over HTTP</p>
          </div>
          <div>
            <p className="text-ops-muted">Connection</p>
            <p className={`font-semibold ${isConnected ? 'text-ops-green' : 'text-ops-red'}`}>
              {isConnected ? 'WebSocket live' : 'WebSocket offline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveJunctionPage;
