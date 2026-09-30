"""
Centroid Tracker Module
Tracks vehicles across frames using centroid tracking algorithm
"""

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CentroidTracker:
    def __init__(self, max_disappeared: int = 30, max_distance: int = 100):
        """
        Initialize centroid tracker
        
        Args:
            max_disappeared: Maximum frames a track can be missing before deletion
            max_distance: Maximum distance for centroid association
        """
        self.next_object_id = 0
        self.objects: Dict[int, Tuple[int, int]] = {}  # object_id -> centroid
        self.disappeared: Dict[int, int] = {}  # object_id -> frames disappeared
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        
        # Track history for drawing trails
        self.track_history: Dict[int, List[Tuple[int, int]]] = {}
        
        logger.info("Centroid tracker initialized")

    def register(self, centroid: Tuple[int, int]):
        """
        Register a new object with a new ID
        
        Args:
            centroid: (x, y) centroid coordinates
        """
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.track_history[self.next_object_id] = [centroid]
        self.next_object_id += 1
        logger.debug(f"Registered new object with ID {self.next_object_id - 1}")

    def deregister(self, object_id: int):
        """
        Deregister an object
        
        Args:
            object_id: ID of object to deregister
        """
        del self.objects[object_id]
        del self.disappeared[object_id]
        if object_id in self.track_history:
            del self.track_history[object_id]
        logger.debug(f"Deregistered object ID {object_id}")

    def update(self, rects: List[Tuple[int, int, int, int]]) -> Dict[int, Tuple[int, int]]:
        """
        Update tracker with new bounding boxes
        
        Args:
            rects: List of (x1, y1, x2, y2) bounding boxes
            
        Returns:
            Dictionary mapping object_id to centroid
        """
        if len(rects) == 0:
            # No detections - mark all objects as disappeared
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            
            return self.objects
        
        # Compute centroids for new detections
        input_centroids = []
        for (x1, y1, x2, y2) in rects:
            cx = int((x1 + x2) / 2.0)
            cy = int((y1 + y2) / 2.0)
            input_centroids.append((cx, cy))
        
        # If no existing objects, register all new detections
        if len(self.objects) == 0:
            for centroid in input_centroids:
                self.register(centroid)
        else:
            # Compute distances between existing centroids and new detections
            object_centroids = list(self.objects.values())
            object_ids = list(self.objects.keys())
            
            # Simple distance-based matching
            D = np.linalg.norm(np.array(object_centroids)[:, np.newaxis] - 
                              np.array(input_centroids), axis=2)
            
            # Sort by distance
            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]
            
            used_rows = set()
            used_cols = set()
            
            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                
                if D[row, col] > self.max_distance:
                    continue
                
                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                
                # Update track history
                if object_id in self.track_history:
                    self.track_history[object_id].append(input_centroids[col])
                    # Keep history limited to last 50 points
                    if len(self.track_history[object_id]) > 50:
                        self.track_history[object_id].pop(0)
                
                used_rows.add(row)
                used_cols.add(col)
            
            # Register unmatched detections
            unused_rows = set(range(0, D.shape[0])) - used_rows
            unused_cols = set(range(0, D.shape[1])) - used_cols
            
            if D.shape[0] >= D.shape[1]:
                # More existing objects than detections
                for row in unused_rows:
                    object_id = object_ids[row]
                    self.disappeared[object_id] += 1
                    
                    if self.disappeared[object_id] > self.max_disappeared:
                        self.deregister(object_id)
            else:
                # More detections than existing objects
                for col in unused_cols:
                    self.register(input_centroids[col])
        
        return self.objects

    def get_track_info(self) -> Dict[int, Dict]:
        """
        Get detailed track information including speed and direction
        
        Returns:
            Dictionary with track details
        """
        track_info = {}
        
        for object_id, centroid in self.objects.items():
            history = self.track_history.get(object_id, [])
            
            if len(history) >= 2:
                # Calculate speed (pixels per frame)
                dx = history[-1][0] - history[-2][0]
                dy = history[-1][1] - history[-2][1]
                speed = np.sqrt(dx**2 + dy**2)
                
                # Calculate direction
                angle = np.arctan2(dy, dx) * 180 / np.pi
                if angle < 0:
                    angle += 360
                
                # Map angle to cardinal direction
                directions = {
                    (337.5, 22.5): "E",
                    (22.5, 67.5): "SE",
                    (67.5, 112.5): "S",
                    (112.5, 157.5): "SW",
                    (157.5, 202.5): "W",
                    (202.5, 247.5): "NW",
                    (247.5, 292.5): "N",
                    (292.5, 337.5): "NE"
                }
                
                direction = "E"  # default
                for (start, end), dir_name in directions.items():
                    if start <= angle <= end:
                        direction = dir_name
                        break
                
                track_info[object_id] = {
                    "centroid": centroid,
                    "speed": speed,
                    "direction": direction,
                    "history": history[-10:]  # Last 10 points
                }
            else:
                track_info[object_id] = {
                    "centroid": centroid,
                    "speed": 0,
                    "direction": "Unknown",
                    "history": history
                }
        
        return track_info

    def draw_tracks(self, frame: np.ndarray, track_info: Dict[int, Dict]) -> np.ndarray:
        """
        Draw tracking information on frame
        
        Args:
            frame: Input frame
            track_info: Track information dictionary
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        
        if cv2 is None:
            return annotated
            
        for object_id, info in track_info.items():
            centroid = info["centroid"]
            history = info["history"]
            speed = info["speed"]
            direction = info["direction"]
            
            # Draw track trail
            if len(history) > 1:
                points = np.array(history, dtype=np.int32)
                cv2.polylines(annotated, [points], False, (0, 255, 255), 2)
            
            # Draw centroid
            cv2.circle(annotated, centroid, 5, (0, 255, 0), -1)
            
            # Draw ID and info
            label = f"ID:{object_id} {direction} {speed:.1f}px/f"
            cv2.putText(annotated, label, (centroid[0] + 10, centroid[1] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return annotated
