"""
Signal State Machine Module
Manages signal state transitions (GREEN -> AMBER -> RED) and countdown timers.
Guarantees smooth second-by-second countdowns without mid-phase jumping.
"""

import time
import logging
from typing import Dict, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class SignalState(Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class SignalStateMachine:
    def __init__(self, lanes: List[str], amber_time: int = 3):
        self.lanes = lanes
        self.amber_time = amber_time
        self.current_lane_index = 0
        self.current_state = SignalState.GREEN
        self.countdown_remaining = 10
        self.green_times = {lane: 10 for lane in lanes}
        self.lane_states = {lane: SignalState.RED for lane in lanes}
        self.lane_states[self.lanes[0]] = SignalState.GREEN
        self._last_tick_ts = time.time()
        self._emergency_until = 0.0
        logger.info(f"Signal SM initialized with lanes: {lanes}")

    @property
    def active_lane(self) -> str:
        return self.lanes[self.current_lane_index]

    def update_green_times(self, green_times: Dict[str, int]):
        """
        Stores newly calculated green times for upcoming cycles.
        DOES NOT alter active countdown_remaining to prevent mid-phase jumping.
        """
        for lane, gtime in green_times.items():
            self.green_times[lane] = int(gtime)

    def tick(self) -> Dict:
        """
        Advances the signal clock by EXACTLY 1 second.
        This is the ONLY place where countdown_remaining decreases.
        """
        now = time.time()
        # Prevent double-ticking faster than 0.9s
        if now - self._last_tick_ts < 0.9:
            return self.get_status()
        self._last_tick_ts = now

        # Handle manual emergency override hold
        if now < self._emergency_until:
            self.countdown_remaining = max(1, int(self._emergency_until - now))
            self.current_state = SignalState.GREEN
            self._update_lane_states()
            return self.get_status()

        # DECREASE COUNTDOWN BY EXACTLY 1
        self.countdown_remaining = max(0, int(self.countdown_remaining) - 1)

        # STATE TRANSITIONS
        if self.countdown_remaining <= 0:
            if self.current_state == SignalState.GREEN:
                # GREEN -> AMBER
                self.current_state = SignalState.AMBER
                self.countdown_remaining = self.amber_time
                logger.info(f"Signal transition: {self.active_lane} GREEN -> AMBER ({self.amber_time}s)")

            elif self.current_state == SignalState.AMBER:
                # AMBER -> NEXT LANE GREEN
                self.lane_states[self.active_lane] = SignalState.RED
                self.current_lane_index = (self.current_lane_index + 1) % len(self.lanes)
                self.current_state = SignalState.GREEN
                
                # LOCK IN GREEN TIME FOR NEW ACTIVE LANE
                next_green = int(self.green_times.get(self.active_lane, 10))
                self.countdown_remaining = next_green
                self.lane_states[self.active_lane] = SignalState.GREEN
                logger.info(f"Signal transition: Now GREEN for {self.active_lane} ({next_green}s)")

        self._update_lane_states()
        return self.get_status()

    def _update_lane_states(self):
        active = self.active_lane
        for lane in self.lanes:
            if lane == active:
                self.lane_states[lane] = self.current_state
            else:
                self.lane_states[lane] = SignalState.RED

    def force_lane_green(self, lane_name: str, duration: int = 30):
        """Manual Emergency Boost / Override"""
        if lane_name not in self.lanes:
            return
        self.current_lane_index = self.lanes.index(lane_name)
        self.current_state = SignalState.GREEN
        self.countdown_remaining = int(duration)
        self._emergency_until = time.time() + int(duration)
        self._update_lane_states()
        logger.info(f"EMERGENCY OVERRIDE: {lane_name} forced GREEN for {duration}s")

    def get_status(self) -> Dict:
        return {
            "active_lane": self.active_lane,
            "signal_state": self.current_state.value,
            "countdown": int(self.countdown_remaining),
            "lane_states": {l: s.value for l, s in self.lane_states.items()},
            "green_times": dict(self.green_times),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }


class SignalController:
    """High-level facade combining AdaptiveTimerEngine and SignalStateMachine."""
    
    def __init__(self, lanes: List[str], timer_config: Optional[Dict] = None):
        from .timer_engine import AdaptiveTimerEngine
        timer_config = timer_config or {}
        self.lanes = lanes
        self.timer_engine = AdaptiveTimerEngine(
            total_cycle_time=timer_config.get("total_cycle_time", 120),
            min_green_time=timer_config.get("min_green_time", 10),
            max_green_time=timer_config.get("max_green_time", 60),
            high_threshold=timer_config.get("high_threshold", 30),
            medium_threshold=timer_config.get("medium_threshold", 15)
        )
        self.state_machine = SignalStateMachine(
            lanes=lanes,
            amber_time=timer_config.get("amber_time", 3)
        )
        # Lock initial countdown
        self.state_machine.countdown_remaining = self.timer_engine.min_green_time

    def update_with_counts(self, lane_counts: Dict[str, int]) -> Dict:
        gt = self.timer_engine.calculate_green_times(lane_counts)
        green_only = {lane: int(data["green_time"]) for lane, data in gt.items()}
        self.state_machine.update_green_times(green_only)
        return self.get_full_status(lane_counts)

    def tick(self) -> Dict:
        return self.state_machine.tick()

    def force_lane_green(self, lane: str, duration: int = 30):
        self.state_machine.force_lane_green(lane, duration)

    def get_full_status(self, lane_counts: Dict[str, int]) -> Dict:
        gt = self.timer_engine.calculate_green_times(lane_counts)
        st = self.state_machine.get_status()

        lane_data = {}
        for lane in self.lanes:
            lane_data[lane] = {
                "count": int(lane_counts.get(lane, 0)),
                "green_time": int(gt.get(lane, {}).get("green_time", 10)),
                "congestion": gt.get(lane, {}).get("congestion", "LOW"),
                "status": st["lane_states"].get(lane, "RED")
            }

        return {
            "active_lane": st["active_lane"],
            "signal_state": st["signal_state"],
            "countdown": st["countdown"],
            "lane_data": lane_data,
            "lane_states": st["lane_states"],
            "green_times": st["green_times"],
            "cycle_progress": {
                "total_cycle_time": self.timer_engine.total_cycle_time,
                "progress_percent": 0
            },
            "metrics": self.timer_engine.calculate_efficiency_metrics(lane_counts, gt)
            if hasattr(self.timer_engine, "calculate_efficiency_metrics") else {},
            "comparison": self.timer_engine.compare_with_fixed_timer(lane_counts, gt)
            if hasattr(self.timer_engine, "compare_with_fixed_timer") else {},
            "timestamp": st["timestamp"]
        }