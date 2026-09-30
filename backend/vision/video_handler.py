"""
Video Handler Module
Handles video input from files, RTSP streams, or synthetic simulation

Simulation mode draws its vehicles from the SAME shared TrafficState that
the timer engine counts, so the canvas visuals always match the lane counts
(what you see = what the signal controller computes).
"""

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np
import time
from typing import Optional, Tuple, Dict
import logging
import random

# Shared singleton traffic state (single source of truth for sim lane counts)
try:
    from ..simulation.traffic_sim import TRAFFIC_STATE
except ImportError:  # pragma: no cover - direct-script fallback
    try:
        from backend.simulation.traffic_sim import TRAFFIC_STATE
    except ImportError:
        TRAFFIC_STATE = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simulation vehicle physics constants
SPEED_PX_PER_SEC = 33.0     # vehicle speed on the synthetic canvas
CAR_SPACING_PX = 27         # queue slot spacing (car length 22 + gap)
MAX_DRAWN_PER_LANE = 10     # cap on rendered cars per lane
CLEAR_DISTANCE_PX = 235     # past-stop-line distance at which cars despawn
                            # (far edge of the junction box, ~500-272+margin)
LANE_LATERAL_OFFSET = 12    # right-side-of-road offset so opposing flows
                            # don't overlap inside the junction box


class VideoHandler:
    def __init__(self, mode: str = "simulation", video_path: Optional[str] = None):
        """
        Initialize video handler
        
        Args:
            mode: "video" for real video, "simulation" for synthetic traffic
            video_path: Path to video file (for video mode)
        """
        self.mode = mode
        self.video_path = video_path
        self.cap = None
        self.frame_count = 0
        self.width = 800
        self.height = 800

        # Persistent simulated vehicles: each car keeps its position across
        # frames instead of being re-generated on every draw (Issue 3).
        self._sim_cars = []      # list of {"lane", "x", "y", "dx", "dy", ...}
        self._last_sim_ts = 0.0  # last physics update timestamp
        self._car_variant = 0    # cycling color variant for new cars

        if mode == "video" and video_path:
            if cv2 is None:
                logger.error("OpenCV not available, switching to simulation mode")
                self.mode = "simulation"
                self._init_simulation()
            else:
                # Check if video file exists
                import os
                if not os.path.exists(video_path):
                    logger.warning(f"Video file not found: {video_path}")
                    logger.info("Falling back to simulation mode")
                    self.mode = "simulation"
                    self._init_simulation()
                else:
                    self.cap = cv2.VideoCapture(video_path)
                    if not self.cap.isOpened():
                        logger.error(f"Failed to open video: {video_path}")
                        logger.info("Falling back to simulation mode")
                        self.mode = "simulation"
                        self._init_simulation()
                    else:
                        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        logger.info(f"Video opened: {video_path} ({self.width}x{self.height})")
        elif mode == "simulation":
            logger.info("Simulation mode initialized")
            self._init_simulation()
        else:
            logger.warning(f"Unknown mode: {mode}, defaulting to simulation")
            self.mode = "simulation"
            self._init_simulation()

    def _init_simulation(self):
        """
        Initialize/reset the synthetic traffic simulation. Called on every
        VideoHandler construction in simulation mode, so switching modes
        (main.py set_mode builds a fresh handler) resets the vehicle list.
        """
        self._sim_cars = []
        self._last_sim_ts = 0.0
        if TRAFFIC_STATE is None:
            logger.warning("Shared TrafficState unavailable - sim visuals will be static")
        else:
            logger.info(
                "Simulation visuals linked to shared TrafficState "
                f"(current counts: {TRAFFIC_STATE.get_counts()})"
            )

    # ------------------------------------------------------------------
    # Geometry helpers for the synthetic intersection
    # ------------------------------------------------------------------

    def _lane_queue_specs(self) -> Dict[str, Dict]:
        """
        Geometry for each lane's approach road and queue area on the
        800x800 synthetic canvas. Queue grows away from the stop line.
        """
        return {
            "Lane_A": {  # North approach, heading south (stop line at y=290)
                "road": [(360, 0), (440, 0), (440, 300), (360, 300)],
                "stop_line": [(360, 290), (440, 290)],
                "axis": "y", "dir": 1,
                "stop_coord": 272,   # front queue slot (car center)
                "kill_coord": 830,   # off-canvas removal point
                "lane_center": 400,
            },
            "Lane_B": {  # East approach, heading west (stop line at x=510)
                "road": [(500, 360), (800, 360), (800, 440), (500, 440)],
                "stop_line": [(510, 360), (510, 440)],
                "axis": "x", "dir": -1,
                "stop_coord": 528,
                "kill_coord": -30,
                "lane_center": 400,
            },
            "Lane_C": {  # South approach, heading north (stop line at y=510)
                "road": [(360, 500), (440, 500), (440, 800), (360, 800)],
                "stop_line": [(360, 510), (440, 510)],
                "axis": "y", "dir": -1,
                "stop_coord": 528,
                "kill_coord": -30,
                "lane_center": 400,
            },
            "Lane_D": {  # West approach, heading east (stop line at x=290)
                "road": [(0, 360), (300, 360), (300, 440), (0, 440)],
                "stop_line": [(290, 360), (290, 440)],
                "axis": "x", "dir": 1,
                "stop_coord": 272,
                "kill_coord": 830,
                "lane_center": 400,
            },
        }

    def _draw_car(self, frame, cx: int, cy: int, heading: str, variant: int):
        """Draw one vehicle rectangle with windshield detail and color variety."""
        w, h = (40, 22) if heading in ("S", "N") else (22, 40)
        palette = [(200, 200, 200), (90, 90, 160), (90, 140, 200), (160, 160, 160),
                   (60, 120, 90), (170, 120, 90), (120, 120, 120)]
        color = palette[variant % len(palette)]
        x1, y1 = cx - w // 2, cy - h // 2
        x2, y2 = cx + w // 2, cy + h // 2
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, -1)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 255), 1)
        # Windshield strip near the front (direction of travel)
        if heading == "S":
            cv2.line(frame, (x1 + 4, y2 - 7), (x2 - 4, y2 - 7), (30, 30, 30), 2)
        elif heading == "N":
            cv2.line(frame, (x1 + 4, y1 + 7), (x2 - 4, y1 + 7), (30, 30, 30), 2)
        elif heading == "W":
            cv2.line(frame, (x1 + 7, y1 + 4), (x1 + 7, y2 - 4), (30, 30, 30), 2)
        else:  # E
            cv2.line(frame, (x2 - 7, y1 + 4), (x2 - 7, y2 - 4), (30, 30, 30), 2)

    def _draw_active_signal_dot(self, frame, lane: str, is_green: bool, active_lane: str):
        """Draw a signal dot next to each stop line (green = active lane)."""
        specs = self._lane_queue_specs()
        dot_positions = {
            "Lane_A": (350, 285),
            "Lane_B": (515, 350),
            "Lane_C": (450, 515),
            "Lane_D": (285, 450),
        }
        pos = dot_positions.get(lane)
        if pos is None:
            return
        color = (0, 255, 0) if is_green else (0, 0, 255)
        cv2.circle(frame, pos, 7, color, -1)
        cv2.circle(frame, pos, 7, (255, 255, 255), 1)
        if is_green and lane == active_lane:
            cv2.putText(frame, "GO", (pos[0] - 16, pos[1] - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 2)

    def _spawn_car(self, lane: str, spec: Dict, distance_behind: int):
        """
        Create a persistent vehicle at `distance_behind` pixels from its
        lane's front queue slot, heading toward the stop line.
        """
        if spec["axis"] == "y":
            x, y = spec["lane_center"], spec["stop_coord"] - spec["dir"] * distance_behind
            x += -LANE_LATERAL_OFFSET * spec["dir"]   # keep right of center
        else:
            x, y = spec["stop_coord"] - spec["dir"] * distance_behind, spec["lane_center"]
            y += -LANE_LATERAL_OFFSET * spec["dir"]   # keep right of center
        self._car_variant += 1
        self._sim_cars.append({
            "lane": lane,
            "x": x, "y": y,
            "dx": spec["dir"] * SPEED_PX_PER_SEC if spec["axis"] == "x" else 0,
            "dy": spec["dir"] * SPEED_PX_PER_SEC if spec["axis"] == "y" else 0,
            "variant": self._car_variant,
            "jitter": ((self._car_variant * 37) % 7) - 3,
            "committed": False,
        })

    def _update_sim_cars(self, dt: float, active_lane: str, signal_state: str):
        """
        Advance the persistent vehicles (dt seconds since last frame).

        All positions are compared in "direction space" (pos * dir), which
        increases along each lane's travel direction - this keeps the math
        identical for all four approaches.

        Signal-aware movement:
        - GREEN lane: queue advances to the stop line, crosses, and clears;
          new cars roll in from off-canvas to maintain the target count.
        - RED/AMBER lane: cars roll up and STOP at the line / behind the car
          ahead; cars already past the line finish clearing the junction.
        """
        specs = self._lane_queue_specs()

        # Target per-lane populations come from the shared TrafficState so the
        # number of visible cars always matches the engine counts.
        counts = TRAFFIC_STATE.get_counts() if TRAFFIC_STATE is not None else {}
        per_lane = {
            lane: min(MAX_DRAWN_PER_LANE, counts.get(lane, 0))
            for lane in specs
        }

        for lane, spec in specs.items():
            green = (lane == active_lane and signal_state == "GREEN")
            axis, dirn = spec["axis"], spec["dir"]
            stop_d = spec["stop_coord"] * dirn          # stop line in dirn space
            clear_d = stop_d + CLEAR_DISTANCE_PX        # despawn past the box
            approach = SPEED_PX_PER_SEC * dt            # distance this frame

            def lane_pos(car):
                return (car["x"] if axis == "x" else car["y"]) * dirn

            # Remove cars that cleared the junction (despawn at the far
            # edge of the box - no departure lanes are drawn on the canvas)
            self._sim_cars = [
                c for c in self._sim_cars
                if not (c["lane"] == lane and lane_pos(c) >= clear_d)
            ]

            lane_cars = sorted(
                (c for c in self._sim_cars if c["lane"] == lane),
                key=lane_pos, reverse=True  # front of the queue first
            )

            # Maintain the target population: spawn behind the rearmost car.
            # _spawn_car's `distance` is measured from the stop line back into
            # the approach (stop_d - spawn_d in direction space).
            while len(lane_cars) < per_lane[lane]:
                rear_d = lane_pos(lane_cars[-1]) if lane_cars else stop_d
                # Never spawn beyond the stop line: if the queue is mid-clear
                # new cars enter at the front slot of the approach instead.
                spawn_d = min(rear_d - CAR_SPACING_PX, stop_d - CAR_SPACING_PX)
                self._spawn_car(lane, spec, stop_d - spawn_d)
                lane_cars = sorted(
                    (c for c in self._sim_cars if c["lane"] == lane),
                    key=lane_pos, reverse=True
                )

            # Drop extras beyond the cap (TrafficState decay handles the rest)
            if len(lane_cars) > per_lane[lane]:
                for car in lane_cars[per_lane[lane]:]:
                    if car in self._sim_cars:
                        self._sim_cars.remove(car)
                lane_cars = lane_cars[:per_lane[lane]]

            # One-by-one queue movement: each car follows the one ahead
            prev_d = None  # direction-space position of the car ahead
            for car in lane_cars:
                pos_d = lane_pos(car)

                if car["committed"] or pos_d >= stop_d:
                    # Committed cars always finish clearing the junction
                    car["committed"] = True
                    pos_d += approach
                else:
                    # Approaching cars (green or red) respect the car ahead.
                    # Green may advance up to the stop line (committing); red
                    # halts 4px short so it can never commit on red.
                    if green:
                        limit_d = stop_d if prev_d is None \
                            else min(stop_d, prev_d - CAR_SPACING_PX)
                    else:
                        limit_d = (stop_d - 4) if prev_d is None \
                            else min(stop_d - 4, prev_d - CAR_SPACING_PX)
                    pos_d = min(pos_d + approach, max(pos_d, limit_d))
                    if green:
                        car["committed"] = pos_d >= stop_d

                if axis == "x":
                    car["x"] = pos_d * dirn
                else:
                    car["y"] = pos_d * dirn
                prev_d = pos_d

    def _draw_sim_cars(self, frame, specs):
        """Draw the persistent vehicles (they keep their positions across frames)."""
        for car in self._sim_cars:
            spec = specs.get(car["lane"])
            if spec is None:
                continue
            # Perpendicular offset keeps queues looking natural
            cx, cy = car["x"], car["y"]
            if spec["axis"] == "y":
                cx += car["jitter"]
            else:
                cy += car["jitter"]
            heading = "S" if car["dy"] > 0 else "N" if car["dy"] < 0 else \
                      "E" if car["dx"] > 0 else "W"
            self._draw_car(frame, int(cx), int(cy), heading, car["variant"])

    def _generate_simulation_frame(self) -> np.ndarray:
        """
        Generate a synthetic traffic frame driven by PERSISTENT vehicles
        (self._sim_cars) whose population is reconciled to the shared
        TrafficState - the exact same counts the signal controller uses.
        Cars roll up on green, queue at the stop line on red, and clear the
        junction once committed. Boosted lanes visibly pile up (capped at
        MAX_DRAWN_PER_LANE cars with a '+N more' overflow badge).
        """
        if cv2 is None:
            return np.zeros((self.height, self.width, 3), dtype=np.uint8)

        # Current signal state + wall-clock delta for physics updates.
        # Imported lazily to avoid a circular import at module load time.
        try:
            from backend.api.websockets import get_signal_snapshot
            snapshot = get_signal_snapshot()
            active_lane = snapshot.get("active_lane", "Lane_A")
            signal_state = snapshot.get("signal_state", "GREEN")
        except Exception:
            active_lane, signal_state = "Lane_A", "GREEN"

        now = time.time()
        dt = min(0.2, now - self._last_sim_ts) if self._last_sim_ts else 1.0 / 15.0
        self._last_sim_ts = now

        # Advance the persistent vehicles (signal-aware movement)
        specs = self._lane_queue_specs()
        self._update_sim_cars(dt, active_lane, signal_state)

        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:] = (45, 45, 45)  # asphalt

        # Intersection box + grass corners for depth
        cv2.rectangle(frame, (300, 300), (500, 500), (35, 35, 35), -1)
        for (cx1, cy1, cx2, cy2) in [(0, 0, 360, 360), (440, 0, 800, 360),
                                     (0, 440, 360, 800), (440, 440, 800, 800)]:
            cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), (25, 60, 25), -1)

        specs = self._lane_queue_specs()

        # Roads, lane separators, stop lines
        for lane, spec in specs.items():
            cv2.fillPoly(frame, [np.array(spec["road"], dtype=np.int32)], (55, 55, 55))
            cv2.line(frame, *spec["stop_line"], (255, 255, 255), 3)

        # Draw the persistent vehicles (positions survive across frames)
        self._draw_sim_cars(frame, specs)

        # Count source of truth (labels + overflow badges)
        if TRAFFIC_STATE is not None:
            counts = TRAFFIC_STATE.get_counts()
        else:
            counts = {lane: 0 for lane in specs}

        for lane, spec in specs.items():
            count = counts.get(lane, 0)
            # Overflow badge when more cars queued than rendered
            visible = sum(1 for c in self._sim_cars if c["lane"] == lane)
            if count > visible:
                dist = CAR_SPACING_PX * (visible + 1)
                if spec["axis"] == "y":
                    bx, by = spec["lane_center"], spec["stop_coord"] - spec["dir"] * dist
                else:
                    bx, by = spec["stop_coord"] - spec["dir"] * dist, spec["lane_center"]
                label = f"+{count - visible}"
                cv2.putText(frame, label, (int(bx) - 20, int(by) + 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

            # Lane label + count badge at the outer end of each approach
            lx, ly = spec["road"][1]
            if lane == "Lane_A":
                lx, ly = 370, 25
            elif lane == "Lane_B":
                lx, ly = 690, 355
            elif lane == "Lane_C":
                lx, ly = 370, 785
            elif lane == "Lane_D":
                lx, ly = 15, 355
            cv2.putText(frame, f"{lane}: {count}", (lx, ly),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            self._draw_active_signal_dot(frame, lane,
                                         lane == active_lane and signal_state == "GREEN",
                                         active_lane)

        # HUD
        timestamp = time.strftime("%H:%M:%S")
        total = sum(counts.values())
        cv2.putText(frame, f"SIMULATION MODE - {timestamp}", (12, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Total vehicles: {total}  |  Active: {active_lane} {signal_state}",
                    (12, self.height - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        return frame

    def read_frame(self) -> Optional[np.ndarray]:
        """
        Read a frame from video or generate simulation frame
        Implements infinite loop for video mode
        
        Returns:
            Frame as numpy array, or None if video ended
        """
        if self.mode == "video" and self.cap and cv2 is not None:
            ret, frame = self.cap.read()
            
            if not ret:
                # Video ended - loop back to start
                logger.info("Video ended — looping back to start...")
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
                if not ret:
                    logger.error("Failed to restart video")
                    return None
            
            self.frame_count += 1
            if self.frame_count % 30 == 0:
                logger.info(f"Read video frame {self.frame_count}, shape: {frame.shape}")
            return frame
        elif self.mode == "simulation":
            self.frame_count += 1
            frame = self._generate_simulation_frame()
            if self.frame_count % 30 == 0:
                logger.info(f"Generated simulation frame {self.frame_count}, shape: {frame.shape}")
            return frame
        else:
            logger.warning(f"Unknown mode or missing cv2: mode={self.mode}, cv2={cv2 is not None}")
            return None

    def get_simulated_counts(self) -> Dict[str, int]:
        """
        Get simulated vehicle counts for each lane
        
        Returns the SHARED TrafficState counts - the same numbers drawn on
        the simulation canvas and consumed by the signal controller.
        """
        if TRAFFIC_STATE is not None:
            return TRAFFIC_STATE.get_counts()
        return {"Lane_A": 0, "Lane_B": 0, "Lane_C": 0, "Lane_D": 0}

    def reset_simulation(self):
        """
        Reset the persistent simulated vehicles. Called when switching modes
        (main.py set_mode) so no stale cars carry across mode changes.
        """
        self._sim_cars = []
        self._last_sim_ts = 0.0
        logger.info("Simulated vehicle state reset")

    def release(self):
        """Release video capture resources"""
        if self.cap:
            self.cap.release()
            logger.info("Video capture released")

    def __del__(self):
        """Cleanup on deletion"""
        self.release()


class SimulationMode:
    """
    Standalone simulation mode that generates vehicle counts
    without video processing (for demo/testing)
    
    Kept for backward compatibility - the live backend now uses the shared
    TrafficState singleton (see simulation.traffic_sim.TRAFFIC_STATE).
    """
    
    def __init__(self):
        self.lanes = ["Lane_A", "Lane_B", "Lane_C", "Lane_D"]
        self.time_step = 0
        logger.info("Simulation mode initialized")
    
    def generate_counts(self) -> Dict[str, int]:
        """
        Generate realistic traffic patterns
        
        Returns:
            Dictionary with vehicle count per lane
        """
        self.time_step += 1
        
        # Simulate rush hour patterns
        hour_factor = (self.time_step % 100) / 100.0  # 0 to 1 over time
        
        # Base counts with rush hour spikes
        base_counts = {
            "Lane_A": int(10 + 20 * hour_factor + random.uniform(-5, 5)),
            "Lane_B": int(15 + 25 * hour_factor + random.uniform(-5, 5)),
            "Lane_C": int(8 + 15 * hour_factor + random.uniform(-5, 5)),
            "Lane_D": int(12 + 18 * hour_factor + random.uniform(-5, 5))
        }
        
        # Ensure non-negative
        for lane in base_counts:
            base_counts[lane] = max(0, base_counts[lane])
        
        logger.info(f"Simulated counts: {base_counts}")
        return base_counts
