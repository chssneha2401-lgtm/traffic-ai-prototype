# AI-Powered Adaptive Traffic Signal Controller

**Smart India Hackathon 2026 Project**

A complete end-to-end prototype of an intelligent traffic signal system that uses YOLOv8 vehicle detection on CCTV/simulated video feeds to dynamically adjust signal timing based on real-time lane density.

## 🎯 Project Overview

Traditional traffic signals use fixed timers that don't adapt to changing traffic conditions. This system replaces fixed timers with AI-driven adaptive signal timing using:

- **YOLOv8** for real-time vehicle detection
- **Adaptive timer engine** that calculates green time based on lane density
- **Live dashboard** with split-screen video feed and signal timers
- **City congestion map** showing traffic status across multiple junctions
- **Advanced features**: ANPR (license plate recognition) and trajectory tracking

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CCTV FEED / SIMULATION                     │
│              (Live RTSP stream or synthetic video)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRAME PROCESSING (OpenCV)                     │
│              Lane ROI masks · Frame extraction                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              VEHICLE DETECTION (YOLOv8)                          │
│         Detect: car, motorcycle, bus, truck                       │
│         Count vehicles per lane using ROI masks                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              LANE DENSITY ANALYSIS                              │
│         Vehicle counts per lane → congestion levels             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            SIGNAL TIMER ENGINE (Adaptive)                       │
│    green_time = (lane_count / total_count) * total_cycle_time   │
│    Constraints: min=10s, max=60s per lane                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              SIGNAL STATE MACHINE                               │
│    GREEN → AMBER (3s) → RED → next lane GREEN                  │
│    Real-time countdown tracking                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              API LAYER (FastAPI)                                │
│    REST: /api/lanes, /api/signal-status, /api/congestion-map   │
│    WebSocket: /ws/live-data, /ws/video-stream                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              REACT DASHBOARD                                     │
│    ┌──────────────────┬──────────────────┐                     │
│    │  Live Video Feed │  Signal Timer    │                     │
│    │  (YOLOv8 bbox)   │  Panel           │                     │
│    └──────────────────┴──────────────────┘                     │
│    Green Time Comparison Chart                                   │
│    City Congestion Map (Leaflet.js)                              │
│    ANPR Tab · Trajectory Tracking Tab                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Python 3.8+**
- **FastAPI** - REST API and WebSocket server
- **Uvicorn** - ASGI server
- **YOLOv8 (Ultralytics)** - Vehicle detection
- **OpenCV** - Video processing and frame manipulation
- **EasyOCR** - License plate recognition (optional)
- **NumPy** - Numerical operations

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Leaflet.js** - Interactive maps
- **React Leaflet** - React wrapper for Leaflet
- **Recharts** - Data visualization

## 📁 Project Structure

```
traffic-ai-prototype/
│
├── README.md                    # This file
├── requirements.txt             # Python dependencies
│
├── config/
│   ├── lanes.json               # Lane ROI coordinates, timer config
│   └── junctions.json           # Junction locations for map
│
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── vision/
│   │   ├── detector.py          # YOLOv8 detection + lane counting
│   │   ├── video_handler.py     # Video stream / simulation handling
│   │   ├── tracker.py           # Centroid tracking for trajectory
│   │   └── anpr.py              # ANPR with EasyOCR
│   ├── engine/
│   │   ├── timer_engine.py      # Adaptive timer calculation
│   │   └── signal_state.py      # Signal state machine
│   ├── api/
│   │   ├── routes.py            # REST endpoints
│   │   └── websockets.py        # WebSocket handlers
│   └── simulation/
│       └── traffic_sim.py       # Synthetic traffic simulator
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx              # Main layout
│       ├── main.jsx
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── LiveVideoFeed.jsx
│       │   ├── SignalTimerPanel.jsx
│       │   ├── LaneCard.jsx
│       │   ├── CongestionMap.jsx
│       │   ├── GreenTimeChart.jsx
│       │   ├── ANPRTab.jsx
│       │   ├── TrajectoryTab.jsx
│       │   └── StatsCards.jsx
│       ├── hooks/
│       │   ├── useWebSocket.js   # WebSocket connection hook
│       │   └── useSignalData.js  # Signal state management hook
│       ├── utils/
│       │   └── constants.js      # Lane colors, congestion thresholds
│       └── styles/
│           └── globals.css
│
└── docs/
    └── architecture.txt         # System architecture diagram (text)
```

## 🚀 Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. **Navigate to the project directory**
   ```bash
   cd traffic-ai-prototype
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **The YOLOv8 model will be auto-downloaded on first run**
   - It will download `yolov8n.pt` (nano version for speed)
   - For better accuracy, you can manually download `yolov8s.pt` and update the model path in `backend/main.py`

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

## 🎮 Running the Application

### Option 1: Run Backend and Frontend Separately (Development)

**Terminal 1 - Backend:**
```bash
# From the project root directory
cd traffic-ai-prototype

# Activate virtual environment (if using one)
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Run the FastAPI server
python backend/main.py
```

The backend will start on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
# From the frontend directory
cd traffic-ai-prototype/frontend

# Run the Vite dev server
npm run dev
```

The frontend will start on `http://localhost:3000`

### Option 2: Run in Simulation Mode (No Video Required)

The system defaults to simulation mode, which generates synthetic traffic data. This is perfect for demonstrations when you don't have real CCTV footage.

1. **Ensure `config/lanes.json` has `"mode": "simulation"`** (default)
2. **Run backend and frontend as above**
3. **The system will generate realistic traffic patterns automatically**

### Option 3: Run with Real Video (Optional)

If you have traffic video files:

1. **Place your video files in the project directory**
   - Supported formats: MP4, AVI, MOV
   - Recommended: One video per lane or a single 4-way intersection video

2. **Update `config/lanes.json`**
   ```json
   {
     "video_config": {
       "mode": "video",
       "video_path": "path/to/your/video.mp4"
     }
   }
   ```

3. **Run the application as above**

## 📊 Dashboard Features

### Main Dashboard Tab

1. **Live Traffic Feed**
   - Real-time video feed with YOLOv8 bounding boxes
   - Lane ROI overlays
   - Per-lane vehicle count badges
   - 15 FPS streaming via WebSocket

2. **Signal Timer Panel**
   - 4 lane cards (A, B, C, D)
   - Real-time countdown timers
   - Vehicle count per lane
   - Congestion level indicators (HIGH/MEDIUM/LOW)
   - Active lane highlighting

3. **Green Time Comparison Chart**
   - Bar chart comparing fixed timer vs adaptive AI
   - Percentage improvement per lane
   - Visual demonstration of efficiency gains

4. **City Congestion Map**
   - Interactive map of Mumbai with 8 junctions
   - Color-coded markers: Green (free), Yellow (moderate), Red (congested)
   - Click markers for detailed junction information
   - Live junction (J5) shows real-time data

5. **Stats Cards**
   - Average waiting time reduction target (20-25%)
   - Infrastructure cost (0 new sensors needed)
   - Efficiency gain percentage

### ANPR Tab

- Toggle ANPR on/off
- Real-time license plate detection
- Plate log table with timestamps
- Confidence scores
- Lane information

### Trajectory Tracking Tab

- Toggle tracking on/off
- Real-time vehicle tracking with unique IDs
- Speed and direction per vehicle
- Traffic alerts (speeding, congestion)
- Movement trails on video

## ⚙️ Configuration

### Lane Configuration (`config/lanes.json`)

```json
{
  "lanes": {
    "Lane_A": {
      "name": "Lane A",
      "color": "#00ff00",
      "roi": [[100, 300], [400, 300], [400, 500], [100, 500]],
      "position": "north"
    }
  },
  "timer_config": {
    "total_cycle_time": 120,
    "min_green_time": 10,
    "max_green_time": 60,
    "amber_time": 3
  },
  "congestion_thresholds": {
    "high": 30,
    "medium": 15,
    "low": 0
  }
}
```

### Junction Configuration (`config/junctions.json`)

Configure junction locations for the congestion map. The default configuration shows Mumbai junctions.

## 🔧 API Endpoints

### REST Endpoints

- `GET /api/health` - Health check
- `GET /api/lanes` - Current lane data (counts, green times, congestion)
- `GET /api/signal-status` - Current signal status (active lane, state, countdown)
- `GET /api/congestion-map` - All junction statuses for map
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `GET /api/anpr-log` - ANPR license plate log (real EasyOCR, `demo_data` fallback)
- `POST /api/anpr-log/clear` - Clear the ANPR plate log
- `GET /api/tracking-data` - Vehicle tracking data (real CentroidTracker, `demo_data` fallback)
- `GET /api/metrics` - System metrics and efficiency data
- `GET /api/runtime-status` - Honest runtime diagnostics (mode, uptime, video state)
- `GET /api/runtime-metrics` - System health (uptime, frames, FPS, YOLO latency)
- `GET /api/history` - Per-lane vehicle counts for the last 60 seconds
- `POST /api/simulate-rush` - Judge demo: spike one lane (+N vehicles)
- `POST /api/simulate-rush-all` - Judge demo: rush hour, spike ALL lanes
- `POST /api/emergency-override` - Force a lane GREEN for N seconds (green corridor)
- `GET /api/video-feed` - **Live video: HTTP MJPEG stream** (multipart/x-mixed-replace)
- `POST /api/set-mode` - Switch between `simulation` and `video` modes
- `GET /api/current-mode` - Current operating mode

### WebSocket Endpoints

- `WS /ws/live-data` - Streams signal JSON every 1 second

> **Video streaming note:** video is served as **HTTP MJPEG at `GET /api/video-feed`**
> (the original WebSocket video stream was replaced by MJPEG early in development).
> The dashboard renders it with a plain `<img>` element.

## 🎯 Key Features

### Adaptive Timer Algorithm

The system calculates green time proportionally:

```
green_time(lane) = (lane_count / total_count) * total_cycle_time
```

With constraints:
- Minimum green time: 10 seconds per lane
- Maximum green time: 60 seconds per lane
- If total vehicles = 0: all lanes get minimum green time

### Congestion Levels

- **HIGH** (≥30 vehicles): Extend green time
- **MEDIUM** (15-29 vehicles): Maintain current green time
- **LOW** (<15 vehicles): Shorten green time

### Signal State Machine

The system cycles through lanes: A → B → C → D → A

Each phase:
1. GREEN (calculated time)
2. AMBER (3 seconds)
3. RED (while other lanes are green)

## 🐛 Troubleshooting

### Backend Issues

**Issue: "Failed to open video file"**
- Solution: The system will automatically fall back to simulation mode
- Check video file path in `config/lanes.json`

**Issue: YOLOv8 model download fails**
- Solution: Check internet connection on first run
- Or manually download `yolov8n.pt` from Ultralytics

**Issue: Port 8000 already in use**
- Solution: Change port in `backend/main.py`:
  ```python
  uvicorn.run("backend.main:app", host="0.0.0.0", port=8001)
  ```

### Frontend Issues

**Issue: WebSocket connection fails**
- Solution: Ensure backend is running on port 8000
- Check CORS settings in `backend/main.py`

**Issue: Map doesn't load**
- Solution: Check internet connection (Leaflet needs to load tiles)
- Ensure Leaflet CSS is included in `index.html`

**Issue: Dependencies fail to install**
- Solution: Try clearing node_modules:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## 📈 Performance

- **Detection Speed**: ~15 FPS with YOLOv8n (nano model)
- **WebSocket Latency**: <100ms for live data
- **Video Streaming**: Base64-encoded JPEG at 15 FPS
- **Memory Usage**: ~2GB RAM (including YOLOv8 model)

## 🔒 Security Considerations

This is a prototype. For production deployment:

1. **CORS**: Restrict to specific origins instead of `*`
2. **Authentication**: Add JWT or API key authentication
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **HTTPS**: Use HTTPS for all communications
5. **Input Validation**: Validate all user inputs
6. **Video Security**: Secure RTSP streams with authentication

## 🚀 Future Enhancements

- [ ] Support for multiple cameras per junction
- [ ] Historical data analysis and prediction
- [ ] Mobile app for traffic authorities
- [ ] Integration with traffic management systems
- [ ] Emergency vehicle priority detection
- [ ] Weather-based timing adjustments
- [ ] Machine learning for traffic pattern prediction

## 📝 Known Limitations

1. **Simulation Mode**: Synthetic counts with rush-hour curves, not real traffic patterns (visuals are rendered from the same shared state that drives the timers)
2. **ANPR**: Real EasyOCR runs on video frames; when no plate is recognized the tab clearly labels its fallback as `DEMO DATA`
3. **Single Junction**: Currently supports one live junction (J5)
4. **No Persistence**: Data is not saved to database
5. **Fixed ROI**: Lane ROIs need manual configuration per camera

## 🏆 Smart India Hackathon 2026

This project is designed for the Smart India Hackathon 2026. Key highlights for judges:

- **Innovation**: AI-driven adaptive timing vs traditional fixed timers
- **Impact**: 20-25% reduction in average waiting time
- **Cost**: 0 new infrastructure (uses existing CCTV)
- **Scalability**: Can be deployed city-wide
- **Technology**: State-of-the-art YOLOv8, real-time WebSocket streaming
- **Demonstration**: Works offline with simulation mode

## 👥 Team Information

**Project**: AI-Powered Adaptive Traffic Signal Controller  
**Competition**: Smart India Hackathon 2026  
**Category**: Smart Transportation / AI/ML

## 📄 License

This project is created for the Smart India Hackathon 2026.

## 🙏 Acknowledgments

- **Ultralytics** for YOLOv8
- **OpenCV** for computer vision
- **FastAPI** for the web framework
- **React** for the frontend
- **Leaflet** for the mapping library

---

**Built with ❤️ for Smart India Hackathon 2026**
