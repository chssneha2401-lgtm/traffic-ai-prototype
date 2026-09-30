import { useState, useEffect, useRef } from 'react';
import { WS_LIVE_DATA_URL } from '../utils/constants';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const liveDataWsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Connect to live data WebSocket
    const connectLiveData = () => {
      if (!isMountedRef.current) return;
      
      // Close existing connection if any
      if (liveDataWsRef.current) {
        liveDataWsRef.current.close();
      }

      const ws = new WebSocket(WS_LIVE_DATA_URL);
      
      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        console.log('Live data WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        const data = JSON.parse(event.data);
        setLiveData(data);
      };
      
      ws.onerror = (error) => {
        console.error('Live data WebSocket error:', error);
      };
      
      ws.onclose = () => {
        if (!isMountedRef.current) return;
        console.log('Live data WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectLiveData, 3000);
      };
      
      liveDataWsRef.current = ws;
    };

    connectLiveData();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (liveDataWsRef.current) {
        liveDataWsRef.current.close();
      }
    };
  }, []);

  return { isConnected, liveData };
}
