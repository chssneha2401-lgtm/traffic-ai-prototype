"""
WebSocket Handlers Module
Handles real-time WebSocket connections for live data streaming
"""

from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
import time
from typing import Dict, Set
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Global state
signal_controller = None
current_lane_counts = None
video_handler = None
detector = None
anpr_system = None
tracker = None
lane_rois = None


def set_globals(controller, lane_counts, handler, det, anpr, trk, rois):
    """Set global variables from main.py"""
    global signal_controller, current_lane_counts, video_handler
    global detector, anpr_system, tracker, lane_rois
    signal_controller = controller
    current_lane_counts = lane_counts
    video_handler = handler
    detector = det
    anpr_system = anpr
    tracker = trk
    lane_rois = rois


# Connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Safely remove websocket from active connections"""
        try:
            self.active_connections.discard(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        except KeyError:
            # Already removed, ignore
            pass
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if self.active_connections:
            message_str = json.dumps(message)
            disconnected = set()
            
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error sending to WebSocket: {e}")
                    disconnected.add(connection)
            
            # Remove disconnected clients
            for connection in disconnected:
                self.disconnect(connection)


# Connection manager for live data
live_data_manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Shared runtime state
# ---------------------------------------------------------------------------

# Rolling per-lane vehicle-count history (last 60 seconds) for /api/history
HISTORY_SECONDS = 60
lane_history = []  # list of {"t": "HH:MM:SS", "Lane_A": n, ...}

# Runtime performance metrics for /api/runtime-metrics
perf = {
    "start_time": time.time(),
    "frames_processed": 0,
    "detection_ms_ema": 0.0,   # exponential moving average of YOLO ms/frame
    "last_status": None,
}

# Fixed cycle time used by /api/history progress reporting
TOTAL_CYCLE_TIME = 120


def record_history(lane_counts):
    """Append one sample to the rolling 60s lane-count history buffer."""
    sample = {"t": time.strftime("%H:%M:%S")}
    for lane, count in (lane_counts or {}).items():
        sample[lane] = int(count)
    lane_history.append(sample)
    if len(lane_history) > HISTORY_SECONDS:
        del lane_history[:-HISTORY_SECONDS]


def get_signal_snapshot() -> dict:
    """Cheap, thread-safe snapshot of the current signal state for overlays."""
    if signal_controller is not None:
        try:
            return signal_controller.state_machine.get_status()
        except Exception:
            pass
    return {"active_lane": "Lane_A", "signal_state": "GREEN", "countdown": 0}


async def websocket_live_data(websocket: WebSocket):
    """
    WebSocket endpoint for live signal data streaming
    Streams JSON every 1 second with:
    - Current active lane
    - Signal state
    - Countdown
    - Lane data (counts, green times, congestion)
    """
    await live_data_manager.connect(websocket)
    
    try:
        while True:
            if signal_controller is None or current_lane_counts is None:
                await asyncio.sleep(1)
                continue
            
            # Get current status
            status = signal_controller.get_full_status(current_lane_counts)
            
            # Create live data message
            live_data = {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "active_lane": status["active_lane"],
                "signal_state": status["signal_state"],
                "countdown": status["countdown"],
                "lane_data": status["lane_data"],
                "total_cycle": status["cycle_progress"]["total_cycle_time"],
                "cycle_progress": status["cycle_progress"]["progress_percent"],
                "avg_waiting_time_target": "20-25% reduction"
            }
            
            await websocket.send_json(live_data)
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        live_data_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error in live data WebSocket: {e}")
        live_data_manager.disconnect(websocket)


async def background_task():
    """Background task to advance signal clock, drain/accumulate queues, and record history."""
    global current_lane_counts, lane_history
    
    while True:
        try:
            # 1. Advance signal state machine by 1 second
            if signal_controller is not None:
                signal_controller.tick()

            # 2. In simulation mode, update queue counts based on active GREEN / RED states
            if video_handler is None or getattr(video_handler, "mode", "simulation") == "simulation":
                from backend.simulation.traffic_sim import TRAFFIC_STATE
                
                active_lane = "Lane_A"
                signal_state = "GREEN"
                if signal_controller and hasattr(signal_controller, "state_machine"):
                    active_lane = signal_controller.state_machine.active_lane
                    signal_state = signal_controller.state_machine.current_state.value

                # Tick traffic state: Green drains cars, Red accumulates cars
                sim_counts = TRAFFIC_STATE.tick(active_lane=active_lane, signal_state=signal_state)
                
                # Update global counts in-place
                if current_lane_counts is not None:
                    current_lane_counts.update(sim_counts)
                else:
                    current_lane_counts = sim_counts.copy()

                if signal_controller is not None:
                    signal_controller.update_with_counts(current_lane_counts)

            # 3. RECORD 60-SECOND ROLLING HISTORY BUFFER FOR THE CHART
            if current_lane_counts is not None:
                snapshot = {
                    "time": time.strftime("%H:%M:%S"),
                    "Lane_A": int(current_lane_counts.get("Lane_A", 0)),
                    "Lane_B": int(current_lane_counts.get("Lane_B", 0)),
                    "Lane_C": int(current_lane_counts.get("Lane_C", 0)),
                    "Lane_D": int(current_lane_counts.get("Lane_D", 0)),
                }
                lane_history.append(snapshot)
                if len(lane_history) > 60:
                    lane_history.pop(0)

            await asyncio.sleep(1.0)
        except Exception as e:
            logger.error(f"Error in background task: {e}")
            await asyncio.sleep(1.0)