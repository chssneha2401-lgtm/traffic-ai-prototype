// Constants for the SignalVision traffic signal controller

// Lane colors per operations-center spec: A green, B cyan, C amber, D red
export const LANE_COLORS = {
  'Lane_A': '#10b981',
  'Lane_B': '#00e5ff',
  'Lane_C': '#f59e0b',
  'Lane_D': '#ef4444',
};

export const SIGNAL_COLORS = {
  GREEN: '#10b981',
  AMBER: '#f59e0b',
  RED: '#ef4444',
};

export const CONGESTION_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export const CONGESTION_THRESHOLDS = {
  HIGH: 30,
  MEDIUM: 15,
  LOW: 0,
};

export const API_BASE_URL = 'http://localhost:8000';
export const WS_LIVE_DATA_URL = 'ws://localhost:8000/ws/live-data';
export const VIDEO_FEED_URL = 'http://localhost:8000/api/video-feed';

export const VEHICLE_CLASSES = {
  2: 'car',
  3: 'motorcycle',
  5: 'bus',
  7: 'truck',
};
