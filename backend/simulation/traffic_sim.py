"""
Synthetic Traffic Simulation Module
Generates realistic traffic patterns for testing and demo purposes
"""

import random
import time
import numpy as np
from typing import Dict, List, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TrafficSimulation:
    """
    Advanced traffic simulation that generates realistic vehicle counts
    with rush hour patterns, random variations, and junction-specific behavior
    """
    
    def __init__(self, num_lanes: int = 4, junction_id: str = "J5"):
        """
        Initialize traffic simulation
        
        Args:
            num_lanes: Number of lanes to simulate
            junction_id: Junction identifier
        """
        self.num_lanes = num_lanes
        self.junction_id = junction_id
        self.lanes = [f"Lane_{chr(65 + i)}" for i in range(num_lanes)]
        self.time_step = 0
        self.hour_of_day = 6  # Start at 6 AM
        
        # Traffic patterns
        self.base_counts = {lane: 10 for lane in self.lanes}
        self.peak_hours = [(8, 10), (17, 19)]  # Morning and evening rush hours
        
        logger.info(f"Traffic simulation initialized for {junction_id} with {num_lanes} lanes")

    def _get_rush_hour_factor(self) -> float:
        """
        Calculate rush hour factor based on current time
        
        Returns:
            Multiplier for base counts (1.0 = normal, >1.0 = rush hour)
        """
        current_hour = self.hour_of_day
        
        for start, end in self.peak_hours:
            if start <= current_hour <= end:
                # Peak rush hour
                progress = (current_hour - start) / (end - start)
                # Bell curve for peak hours
                factor = 1.0 + 2.0 * np.sin(progress * np.pi)
                return factor
        
        # Off-peak
        return 0.8

    def _generate_lane_specific_counts(self, rush_factor: float) -> Dict[str, int]:
        """
        Generate counts with lane-specific patterns
        
        Args:
            rush_factor: Rush hour multiplier
            
        Returns:
            Dictionary with lane counts
        """
        counts = {}
        
        for i, lane in enumerate(self.lanes):
            # Each lane has different characteristics
            base = self.base_counts[lane]
            
            # Lane-specific variations
            lane_multiplier = 1.0
            
            # Lane A (North) - busy in morning
            if i == 0 and 7 <= self.hour_of_day <= 9:
                lane_multiplier = 1.5
            
            # Lane B (East) - busy in evening
            elif i == 1 and 17 <= self.hour_of_day <= 19:
                lane_multiplier = 1.4
            
            # Lane C (South) - moderate all day
            elif i == 2:
                lane_multiplier = 1.1
            
            # Lane D (West) - variable
            elif i == 3:
                lane_multiplier = random.uniform(0.8, 1.3)
            
            # Apply factors
            count = int(base * rush_factor * lane_multiplier)
            
            # Add random variation
            variation = random.randint(-5, 8)
            count = max(0, count + variation)
            
            counts[lane] = count
        
        return counts

    def _update_time(self):
        """Update simulation time (advances 1 minute per call)"""
        self.time_step += 1
        self.hour_of_day = (self.hour_of_day + (1/60)) % 24

    def generate_counts(self) -> Dict[str, int]:
        """
        Generate vehicle counts for current time step
        
        Returns:
            Dictionary with vehicle count per lane
        """
        # Update time
        self._update_time()
        
        # Get rush hour factor
        rush_factor = self._get_rush_hour_factor()
        
        # Generate counts
        counts = self._generate_lane_specific_counts(rush_factor)
        
        # Log if significant change
        total = sum(counts.values())
        if self.time_step % 10 == 0:  # Log every 10 steps
            logger.info(f"Simulation Step {self.time_step} - Hour: {int(self.hour_of_day):02d}:{int((self.hour_of_day % 1) * 60):02d} - "
                       f"Total vehicles: {total} - Rush factor: {rush_factor:.2f}")
        
        return counts

    def set_time(self, hour: int, minute: int = 0):
        """
        Manually set simulation time
        
        Args:
            hour: Hour (0-23)
            minute: Minute (0-59)
        """
        self.hour_of_day = hour + minute / 60
        logger.info(f"Simulation time set to {hour:02d}:{minute:02d}")

    def get_time_str(self) -> str:
        """Get current simulation time as string"""
        hour = int(self.hour_of_day)
        minute = int((self.hour_of_day % 1) * 60)
        return f"{hour:02d}:{minute:02d}"


class MultiJunctionSimulation:
    """
    Simulate multiple junctions across the city
    """
    
    def __init__(self, junction_configs: List[Dict]):
        """
        Initialize multi-junction simulation
        
        Args:
            junction_configs: List of junction configuration dictionaries
        """
        self.junctions = {}
        
        for config in junction_configs:
            junction_id = config["id"]
            num_lanes = config.get("num_lanes", 4)
            self.junctions[junction_id] = TrafficSimulation(
                num_lanes=num_lanes,
                junction_id=junction_id
            )
        
        logger.info(f"Multi-junction simulation initialized with {len(self.junctions)} junctions")

    def generate_all_counts(self) -> Dict[str, Dict]:
        """
        Generate counts for all junctions
        
        Returns:
            Dictionary mapping junction_id to lane counts
        """
        all_counts = {}
        
        for junction_id, sim in self.junctions.items():
            all_counts[junction_id] = sim.generate_counts()
        
        return all_counts

    def get_junction_counts(self, junction_id: str) -> Dict[str, int]:
        """
        Get counts for a specific junction
        
        Args:
            junction_id: Junction identifier
            
        Returns:
            Lane counts for the junction
        """
        if junction_id not in self.junctions:
            logger.error(f"Unknown junction: {junction_id}")
            return {}
        
        return self.junctions[junction_id].generate_counts()


class TrafficState:
    def __init__(self):
        self.counts = {"Lane_A": 18, "Lane_B": 32, "Lane_C": 10, "Lane_D": 22}
        self.last_tick = time.time()

    def add_boost(self, lane: str, count: int = 15):
        """Force traffic spike for judge presentation."""
        if lane in self.counts:
            self.counts[lane] = min(60, self.counts[lane] + count)
            logger.info(f"Boosted {lane} by +{count}. New count: {self.counts[lane]}")

    def add_boost_all(self, count: int = 15):
        """Simulate citywide rush hour surge."""
        for lane in self.counts:
            self.counts[lane] = min(60, self.counts[lane] + count)

    def tick(self, active_lane: str = "Lane_A", signal_state: str = "GREEN") -> Dict[str, int]:
        """
        Advances traffic simulation by 1 second:
        - Active GREEN lane DISCHARGES queue (count goes DOWN).
        - RED lanes ACCUMULATE arriving traffic (count goes UP).
        """
        now = time.time()
        if now - self.last_tick < 0.9:
            return self.get_counts()
        self.last_tick = now

        for lane in self.counts:
            if lane == active_lane and signal_state == "GREEN":
                # GREEN LANE: Vehicles discharge through green light (1-2 cars/sec)
                discharge = random.randint(1, 2)
                self.counts[lane] = max(0, self.counts[lane] - discharge)
            else:
                # RED / AMBER LANES: Arriving vehicles stack in queue (45% chance/sec)
                if random.random() < 0.45:
                    self.counts[lane] = min(55, self.counts[lane] + 1)

        return self.get_counts()

    def get_counts(self) -> Dict[str, int]:
        return dict(self.counts)


# Shared Singleton Instance
TRAFFIC_STATE = TrafficState()

# Module-level singleton instance shared across backend modules
TRAFFIC_STATE = TrafficState()


# Convenience function for creating demo simulation
def create_demo_simulation() -> TrafficSimulation:
    """
    Create a demo simulation for a single junction
    
    Returns:
        TrafficSimulation instance
    """
    return TrafficSimulation(num_lanes=4, junction_id="J5")


if __name__ == "__main__":
    # Test the simulation
    print("Testing Traffic Simulation...")
    print("=" * 60)
    
    sim = create_demo_simulation()
    
    # Simulate 24 hours (1440 minutes)
    for i in range(100):  # Run for 100 steps as example
        counts = sim.generate_counts()
        total = sum(counts.values())
        
        if i % 20 == 0:
            print(f"Step {i}: {sim.get_time_str()} - Total: {total} vehicles")
            print(f"  Lane counts: {counts}")
    
    print("=" * 60)
    print("Simulation test complete")
