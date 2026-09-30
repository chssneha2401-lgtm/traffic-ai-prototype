"""
Adaptive Timer Engine Module
Calculates green time allocations based on vehicle density per lane
"""

from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AdaptiveTimerEngine:
    def __init__(
        self,
        total_cycle_time: int = 120,
        min_green_time: int = 10,
        max_green_time: int = 60,
        high_threshold: int = 30,
        medium_threshold: int = 15
    ):
        """
        Initialize adaptive timer engine
        
        Args:
            total_cycle_time: Total time for one complete cycle (all lanes)
            min_green_time: Minimum green time per lane
            max_green_time: Maximum green time per lane
            high_threshold: Vehicle count for HIGH congestion
            medium_threshold: Vehicle count for MEDIUM congestion
        """
        self.total_cycle_time = total_cycle_time
        self.min_green_time = min_green_time
        self.max_green_time = max_green_time
        self.high_threshold = high_threshold
        self.medium_threshold = medium_threshold
        
        logger.info(f"Timer engine initialized: cycle={total_cycle_time}s, "
                   f"min={min_green_time}s, max={max_green_time}s")

    def calculate_green_times(self, lane_counts: Dict[str, int]) -> Dict[str, Dict]:
        """
        Calculate green time allocation for each lane based on vehicle counts
        
        Args:
            lane_counts: Dictionary mapping lane names to vehicle counts
            
        Returns:
            Dictionary with green_time and congestion_level for each lane
        """
        total_vehicles = sum(lane_counts.values())
        lanes = list(lane_counts.keys())
        
        # Handle edge case: no vehicles
        if total_vehicles == 0:
            logger.info("No vehicles detected - allocating minimum green time to all lanes")
            return {
                lane: {
                    "green_time": self.min_green_time,
                    "congestion": "LOW",
                    "count": 0
                }
                for lane in lanes
            }
        
        # Calculate proportional green times
        green_times = {}
        total_allocated = 0
        
        for lane in lanes:
            count = lane_counts[lane]
            # Proportional allocation
            proportional_time = (count / total_vehicles) * self.total_cycle_time
            
            # Apply constraints
            green_time = max(self.min_green_time, min(self.max_green_time, int(proportional_time)))
            
            # Determine congestion level
            if count >= self.high_threshold:
                congestion = "HIGH"
            elif count >= self.medium_threshold:
                congestion = "MEDIUM"
            else:
                congestion = "LOW"
            
            green_times[lane] = {
                "green_time": green_time,
                "congestion": congestion,
                "count": count
            }
            total_allocated += green_time
        
        # Adjust if total allocation exceeds cycle time
        if total_allocated > self.total_cycle_time:
            logger.warning(f"Total allocation ({total_allocated}s) exceeds cycle time, scaling down")
            scale_factor = self.total_cycle_time / total_allocated
            for lane in green_times:
                original_time = green_times[lane]["green_time"]
                scaled_time = max(self.min_green_time, int(original_time * scale_factor))
                green_times[lane]["green_time"] = scaled_time
        
        # Log the allocation
        logger.info(f"Green time allocation: {green_times}")
        
        return green_times

    def get_congestion_level(self, count: int) -> str:
        """
        Get congestion level based on vehicle count
        
        Args:
            count: Vehicle count
            
        Returns:
            Congestion level: HIGH, MEDIUM, or LOW
        """
        if count >= self.high_threshold:
            return "HIGH"
        elif count >= self.medium_threshold:
            return "MEDIUM"
        else:
            return "LOW"

    def adjust_for_congestion(
        self,
        green_times: Dict[str, Dict],
        lane_counts: Dict[str, int]
    ) -> Dict[str, Dict]:
        """
        Adjust green times based on congestion levels
        - HIGH congestion: extend green time (up to max)
        - MEDIUM congestion: maintain current green time
        - LOW congestion: shorten green time (down to min)
        
        Args:
            green_times: Current green time allocations
            lane_counts: Current vehicle counts
            
        Returns:
            Adjusted green time allocations
        """
        adjusted_times = {}
        
        for lane in green_times:
            count = lane_counts[lane]
            current_time = green_times[lane]["green_time"]
            congestion = self.get_congestion_level(count)
            
            if congestion == "HIGH":
                # Extend green time if not already at max
                new_time = min(self.max_green_time, current_time + 5)
            elif congestion == "MEDIUM":
                # Maintain current time
                new_time = current_time
            else:  # LOW
                # Shorten green time if not already at min
                new_time = max(self.min_green_time, current_time - 3)
            
            adjusted_times[lane] = {
                "green_time": new_time,
                "congestion": congestion,
                "count": count
            }
        
        logger.info(f"Adjusted green times for congestion: {adjusted_times}")
        return adjusted_times

    def calculate_efficiency_metrics(
        self,
        lane_counts: Dict[str, int],
        green_times: Dict[str, Dict]
    ) -> Dict[str, float]:
        """
        Calculate efficiency metrics for the adaptive system
        
        Args:
            lane_counts: Vehicle counts per lane
            green_times: Green time allocations
            
        Returns:
            Dictionary with efficiency metrics
        """
        total_vehicles = sum(lane_counts.values())
        total_green_time = sum(gt["green_time"] for gt in green_times.values())
        
        if total_vehicles == 0:
            return {
                "vehicles_per_second": 0.0,
                "avg_green_time": self.min_green_time,
                "cycle_efficiency": 0.0
            }
        
        vehicles_per_second = total_vehicles / total_green_time
        avg_green_time = total_green_time / len(green_times)
        
        # Efficiency: ratio of actual allocation to ideal allocation
        # Ideal would be proportional distribution without constraints
        cycle_efficiency = min(1.0, total_green_time / self.total_cycle_time)
        
        metrics = {
            "vehicles_per_second": round(vehicles_per_second, 2),
            "avg_green_time": round(avg_green_time, 1),
            "cycle_efficiency": round(cycle_efficiency, 2)
        }
        
        logger.info(f"Efficiency metrics: {metrics}")
        return metrics

    def compare_with_fixed_timer(
        self,
        lane_counts: Dict[str, int],
        adaptive_times: Dict[str, Dict]
    ) -> Dict[str, Dict]:
        """
        Compare adaptive timing with fixed timing (equal distribution)
        
        Args:
            lane_counts: Vehicle counts per lane
            adaptive_times: Adaptive green time allocations
            
        Returns:
            Comparison data
        """
        num_lanes = len(lane_counts)
        fixed_time = self.total_cycle_time // num_lanes
        
        comparison = {}
        for lane in lane_counts:
            adaptive = adaptive_times[lane]["green_time"]
            count = lane_counts[lane]
            
            comparison[lane] = {
                "fixed_time": fixed_time,
                "adaptive_time": adaptive,
                "difference": adaptive - fixed_time,
                "count": count,
                "improvement": ((adaptive - fixed_time) / fixed_time * 100) if fixed_time > 0 else 0
            }
        
        logger.info(f"Fixed vs Adaptive comparison: {comparison}")
        return comparison


class TimerConfig:
    """Configuration class for timer parameters"""
    
    def __init__(
        self,
        total_cycle_time: int = 120,
        min_green_time: int = 10,
        max_green_time: int = 60,
        amber_time: int = 3,
        high_threshold: int = 30,
        medium_threshold: int = 15
    ):
        self.total_cycle_time = total_cycle_time
        self.min_green_time = min_green_time
        self.max_green_time = max_green_time
        self.amber_time = amber_time
        self.high_threshold = high_threshold
        self.medium_threshold = medium_threshold
    
    def to_dict(self) -> Dict:
        """Convert config to dictionary"""
        return {
            "total_cycle_time": self.total_cycle_time,
            "min_green_time": self.min_green_time,
            "max_green_time": self.max_green_time,
            "amber_time": self.amber_time,
            "high_threshold": self.high_threshold,
            "medium_threshold": self.medium_threshold
        }
    
    @classmethod
    def from_dict(cls, config_dict: Dict) -> 'TimerConfig':
        """Create config from dictionary"""
        return cls(
            total_cycle_time=config_dict.get("total_cycle_time", 120),
            min_green_time=config_dict.get("min_green_time", 10),
            max_green_time=config_dict.get("max_green_time", 60),
            amber_time=config_dict.get("amber_time", 3),
            high_threshold=config_dict.get("high_threshold", 30),
            medium_threshold=config_dict.get("medium_threshold", 15)
        )
