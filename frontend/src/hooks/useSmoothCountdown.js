import { useState, useEffect, useRef } from 'react';

/**
 * Smooths the server-driven countdown into a stable 1-second UI ticker.
 *
 * The WebSocket broadcasts every ~1s, but message arrival jitter (network +
 * event-loop scheduling) makes raw value replacement flicker/stutter in the
 * UI. This hook:
 *   1. Snaps to the server value on phase changes (lane transition, AMBER,
 *      emergency override): those must be instant and exact.
 *   2. Otherwise ticks down locally at exactly 1s between messages.
 *   3. Re-syncs from the server only on MATERIAL drift: server ahead by any
 *      amount (covers surge extensions, tab-throttling catch-up) or client
 *      more than 1s ahead (accumulated ticker drift). Small +/-1s jitter is
 *      ignored, so the display never flickers.
 *
 * REST polling (/api/lanes via useSignalData) is deliberately NOT connected
 * here: the displayed countdown is driven strictly by the WebSocket stream.
 */
export function useSmoothCountdown(liveData) {
  const [displayCountdown, setDisplayCountdown] = useState(null);
  const valueRef = useRef(null);   // current displayed value (number | null)
  const phaseRef = useRef(null);   // "active_lane:signal_state" of last sync

  // Server sync on each WebSocket message
  useEffect(() => {
    if (!liveData) return;
    const incoming =
      typeof liveData.countdown === 'number' ? liveData.countdown : null;
    if (incoming === null) return;

    const phase = `${liveData.active_lane}:${liveData.signal_state}`;

    // First value ever, or a phase change (transition / override): snap
    if (valueRef.current === null || phase !== phaseRef.current) {
      valueRef.current = incoming;
      phaseRef.current = phase;
      setDisplayCountdown(incoming);
      return;
    }

    const local = valueRef.current;
    const serverAhead = incoming > local;          // surge extension / catch-up
    const driftedBehind = local - incoming >= 2;   // local ticker ran fast

    if (serverAhead || driftedBehind) {
      valueRef.current = incoming;
      setDisplayCountdown(incoming);
    }
    // |diff| <= 1 with same phase: ignore jitter, local ticker stays smooth
  }, [liveData]);

  // Local 1-second ticker between WebSocket messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (valueRef.current !== null && valueRef.current > 0) {
        valueRef.current -= 1;
        setDisplayCountdown(valueRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return displayCountdown;
}
