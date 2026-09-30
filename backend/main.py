"""
Main FastAPI Application Entry Point
AI-Powered Adaptive Traffic Signal Controller
"""

import sys
import os
import asyncio
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import logging

import cv2
import numpy as np

# PyTorch 2.6 weights_only fix
import torch
_orig_load = torch.load
torch.load = lambda *a, **kw: _orig_load(*a, **{**kw, "weights_only": False})

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.routes import router, set_globals
from backend.api.websockets import (
    websocket_live_data, 
    background_task,
    perf,
    set_globals as set_ws_globals
)
from backend.vision.detector import VehicleDetector, load_lanes_config
from backend.vision.video_handler import VideoHandler
from backend.vision.tracker import CentroidTracker
from backend.vision.anpr import get_anpr_system
from backend.engine.signal_state import SignalController

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Global variables
signal_controller = None
current_lane_counts = None
video_handler = None
detector = None
anpr_system = None
tracker = None
lane_rois = None
current_mode = "simulation"  # Default mode


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("=" * 60)
    logger.info("Starting AI-Powered Adaptive Traffic Signal Controller")
    logger.info("=" * 60)
    
    global signal_controller, current_lane_counts, video_handler
    global detector, anpr_system, tracker, lane_rois, current_mode
    
    try:
        # Load configuration
        logger.info("Loading configuration...")
        config = load_lanes_config()
        lane_rois = config["lane_rois"]
        timer_config = config["timer_config"]
        video_config = config["video_config"]
        
        current_mode = video_config.get("mode", "simulation")
        
        logger.info(f"Loaded {len(lane_rois)} lane configurations")
        logger.info(f"Timer config: {timer_config}")
        logger.info(f"Video mode: {current_mode}")
        
        # Initialize video handler
        logger.info("Initializing video handler...")
        # Get absolute path to video file
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        video_path = os.path.join(project_root, "sample_videos", "intersection.mp4") if current_mode == "video" else None
        
        if current_mode == "video" and video_path:
            logger.info(f"Video path: {video_path}")
            video_handler = VideoHandler(mode="video", video_path=video_path)
        else:
            video_handler = VideoHandler(mode="simulation")
        
        # Initialize detector
        logger.info("Initializing YOLOv8 detector...")
        detector = VehicleDetector(model_path="yolov8n.pt", conf_threshold=0.5)
        
        # Initialize tracker
        logger.info("Initializing centroid tracker...")
        tracker = CentroidTracker(max_disappeared=30, max_distance=100)
        
        # Initialize ANPR system
        # Real EasyOCR ANPR (falls back to a mock instance automatically if
        # EasyOCR is unavailable or fails to load - see vision/anpr.py)
        logger.info("Initializing ANPR system (EasyOCR, real mode)...")
        anpr_system = get_anpr_system(use_mock=False)
        
        # Initialize signal controller
        logger.info("Initializing signal controller...")
        lanes = list(lane_rois.keys())
        signal_controller = SignalController(lanes=lanes, timer_config=timer_config)
        
        # Initialize lane counts
        current_lane_counts = {lane: 0 for lane in lanes}
        
        # Set globals for API routes
        set_globals(signal_controller, current_lane_counts, video_handler,
                    det=detector, anpr=anpr_system, trk=tracker)
        set_ws_globals(
            signal_controller, 
            current_lane_counts, 
            video_handler,
            detector,
            anpr_system,
            tracker,
            lane_rois
        )
        
        logger.info("All components initialized successfully")
        logger.info("=" * 60)
        
        # Start background task
        asyncio.create_task(background_task())
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    if video_handler:
        video_handler.release()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="AI-Powered Adaptive Traffic Signal Controller",
    description="Smart traffic signal system using YOLOv8 vehicle detection and adaptive timing",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")

# WebSocket endpoint
app.websocket("/ws/live-data")(websocket_live_data)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI-Powered Adaptive Traffic Signal Controller API",
        "version": "1.0.0",
        "status": "running",
        "current_mode": current_mode,
        "endpoints": {
            "health": "/api/health",
            "lanes": "/api/lanes",
            "signal_status": "/api/signal-status",
            "congestion_map": "/api/congestion-map",
            "video_feed": "/api/video-feed",
            "set_mode": "/api/set-mode",
            "current_mode": "/api/current-mode",
            "runtime_status": "/api/runtime-status",
            "websocket_live_data": "/ws/live-data"
        }
    }


@app.get("/api/video-feed")
async def video_feed():
    """
    MJPEG video streaming endpoint
    Returns multipart/x-mixed-replace stream of JPEG frames
    """
    global video_handler, detector, lane_rois, tracker, anpr_system, current_mode
    
    logger.info(f"Video feed requested. Mode: {current_mode}, Handler: {video_handler is not None}")
    
    def generate_frames():
        """Generator function that yields JPEG frames"""
        frame_count = 0
        logger.info("Frame generator started")
        consecutive_failures = 0
        while True:
            if video_handler is None:
                logger.warning("Video handler is None, waiting...")
                time.sleep(0.1)
                continue
            
            # Read frame
            frame = video_handler.read_frame()
            
            if frame is None:
                consecutive_failures += 1
                if consecutive_failures % 10 == 0:
                    logger.warning(f"Failed to read frame (count: {frame_count}, consecutive failures: {consecutive_failures}), retrying...")
                time.sleep(0.1)
                continue
            
            consecutive_failures = 0
            frame_count += 1
            if frame_count % 30 == 0:
                logger.info(f"Streaming frame {frame_count}, mode: {video_handler.mode}, shape: {frame.shape}")
            
            # Process frame with detector if available and in video mode
            if detector is not None and lane_rois is not None and current_mode == "video":
                try:
                    t0 = time.perf_counter()
                    detections = detector.detect_vehicles(frame)
                    lane_counts = detector.count_vehicles_per_lane(detections, lane_rois)
                    detection_ms = (time.perf_counter() - t0) * 1000.0
                    perf["detection_ms_ema"] = (
                        detection_ms if perf["detection_ms_ema"] == 0.0
                        else 0.9 * perf["detection_ms_ema"] + 0.1 * detection_ms
                    )
                    perf["frames_processed"] += 1
                    
                    # Update shared lane counts IN PLACE so every module
                    # (REST, WebSocket, video) sees the same dict
                    global current_lane_counts
                    if current_lane_counts is None:
                        current_lane_counts = dict(lane_counts)
                    else:
                        for lane, count in lane_counts.items():
                            current_lane_counts[lane] = count
                    
                    # Draw detections on frame
                    frame = detector.draw_detections(frame, detections, lane_rois, lane_counts)
                    
                    # Apply tracking if enabled
                    if tracker is not None:
                        rects = [d["bbox"] for d in detections]
                        tracker.update(rects)
                        track_info = tracker.get_track_info()
                        frame = tracker.draw_tracks(frame, track_info)
                    
                    # Apply ANPR if enabled (real EasyOCR; skips silently if
                    # the reader is unavailable)
                    if anpr_system is not None and detections:
                        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                        for detection in detections:
                            lane = "Unknown"
                            for lane_name, roi in lane_rois.items():
                                try:
                                    if cv2.pointPolygonTest(
                                        np.array(roi, dtype=np.int32),
                                        detection["center"],
                                        False
                                    ) >= 0:
                                        lane = lane_name
                                        break
                                except Exception:
                                    pass

                            try:
                                anpr_system.process_vehicle(
                                    frame,
                                    detection["bbox"],
                                    lane,
                                    timestamp
                                )
                            except Exception as e:
                                logger.debug(f"ANPR processing failed: {e}")
                    
                except Exception as e:
                    logger.error(f"Error processing frame: {e}")
            
            # Encode frame as JPEG
            try:
                import cv2
                if cv2 is not None:
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    frame_bytes = buffer.tobytes()
                else:
                    # Fallback
                    import io
                    from PIL import Image
                    pil_image = Image.fromarray(frame)
                    buffer_io = io.BytesIO()
                    pil_image.save(buffer_io, format='JPEG', quality=80)
                    frame_bytes = buffer_io.getvalue()
            except Exception as e:
                logger.error(f"Error encoding frame: {e}")
                time.sleep(0.1)
                continue
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive"
        }
    )


@app.post("/api/set-mode")
async def set_mode(mode_data: dict):
    """
    Set the operating mode (video or simulation)
    """
    global current_mode, video_handler, current_lane_counts
    
    try:
        new_mode = mode_data.get("mode", "simulation")
        
        if new_mode not in ["video", "simulation"]:
            return {"status": "error", "message": "Invalid mode. Use 'video' or 'simulation'"}
        
        logger.info(f"Switching mode from {current_mode} to {new_mode}")
        
        # Release current video handler
        if video_handler:
            video_handler.release()
        
        # Initialize new video handler
        if new_mode == "video":
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            video_path = os.path.join(project_root, "sample_videos", "intersection.mp4")
            logger.info(f"Video path: {video_path}")
            video_handler = VideoHandler(mode="video", video_path=video_path)
        else:
            video_handler = VideoHandler(mode="simulation")
        
        current_mode = new_mode
        
        # Reset persistent simulated vehicles on mode switch
        if video_handler is not None:
            video_handler.reset_simulation()
        
        # Reset lane counts (mutate in place so all modules share one dict)
        lanes = list(lane_rois.keys()) if lane_rois else ["Lane_A", "Lane_B", "Lane_C", "Lane_D"]
        if current_lane_counts is None:
            current_lane_counts = {lane: 0 for lane in lanes}
        else:
            for lane in lanes:
                current_lane_counts[lane] = 0
        
        logger.info(f"Mode switched to {new_mode}")
        return {"status": "success", "mode": current_mode}
        
    except Exception as e:
        logger.error(f"Error switching mode: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/current-mode")
async def get_current_mode():
    """Get the current operating mode"""
    return {"mode": current_mode}


@app.get("/api/runtime-status")
async def get_runtime_status():
    """
    Get runtime status for debugging.
    Returns honest diagnostics: mode, video state, uptime, active lane, totals.
    """
    video_open = False
    try:
        if video_handler is not None and video_handler.cap is not None and cv2 is not None:
            video_open = bool(video_handler.cap.isOpened())
    except Exception as e:
        logger.error(f"Error checking video state: {e}")

    active_lane = None
    signal_state = None
    countdown = None
    if signal_controller is not None:
        try:
            sm_status = signal_controller.state_machine.get_status()
            active_lane = sm_status.get("active_lane")
            signal_state = sm_status.get("signal_state")
            countdown = sm_status.get("countdown")
        except Exception as e:
            logger.error(f"Error reading signal state: {e}")

    total_vehicles = sum((current_lane_counts or {}).values())

    return {
        "current_mode": current_mode,
        "video_handler_initialized": video_handler is not None,
        "video_handler_mode": video_handler.mode if video_handler else None,
        "video_path": video_handler.video_path if video_handler else None,
        "video_open": video_open,
        "video_dimensions": {
            "width": video_handler.width,
            "height": video_handler.height,
        } if video_handler else None,
        "frame_count": video_handler.frame_count if video_handler else 0,
        "backend_uptime_sec": round(time.time() - perf["start_time"], 1),
        "detector_initialized": detector is not None,
        "signal_controller_initialized": signal_controller is not None,
        "anpr_mode": ("mock" if anpr_system is not None and anpr_system.__class__.__name__ == "MockANPRSystem" else "easyocr") if anpr_system is not None else None,
        "active_lane": active_lane,
        "signal_state": signal_state,
        "countdown": countdown,
        "total_vehicles": total_vehicles,
        "lane_counts": current_lane_counts,
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting server...")
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
