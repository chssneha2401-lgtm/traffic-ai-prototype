"""
YOLOv8 Vehicle Detection Module
Detects vehicles in video frames and counts them per lane
"""

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np
from ultralytics import YOLO
from typing import Dict, List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VehicleDetector:
    def __init__(self, model_path: str = "yolov8n.pt", conf_threshold: float = 0.5):
        """
        Initialize YOLOv8 detector for vehicle detection
        
        Args:
            model_path: Path to YOLOv8 model (will auto-download if not found)
            conf_threshold: Confidence threshold for detections
        """
        logger.info(f"Loading YOLOv8 model from {model_path}...")
        self.model = YOLO(model_path)
        self.conf_threshold = conf_threshold
        
        # COCO class IDs for vehicles
        self.vehicle_classes = {
            2: "car",
            3: "motorcycle", 
            5: "bus",
            7: "truck"
        }
        
        logger.info("YOLOv8 model loaded successfully")

    def detect_vehicles(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect vehicles in a frame using YOLOv8
        
        Args:
            frame: Input frame (numpy array)
            
        Returns:
            List of detection dictionaries with class, bbox, confidence
        """
        results = self.model(frame, conf=self.conf_threshold, verbose=False)
        detections = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                if class_id in self.vehicle_classes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0])
                    
                    detections.append({
                        "class": self.vehicle_classes[class_id],
                        "class_id": class_id,
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "confidence": confidence,
                        "center": ((int(x1) + int(x2)) // 2, (int(y1) + int(y2)) // 2)
                    })
        
        logger.debug(f"Detected {len(detections)} vehicles")
        return detections

    def count_vehicles_per_lane(
        self, 
        detections: List[Dict], 
        lane_rois: Dict[str, List[Tuple[int, int]]]
    ) -> Dict[str, int]:
        """
        Count vehicles per lane using ROI masks
        
        Args:
            detections: List of vehicle detections
            lane_rois: Dictionary mapping lane names to ROI polygon coordinates
            
        Returns:
            Dictionary with vehicle count per lane
        """
        lane_counts = {lane: 0 for lane in lane_rois.keys()}
        
        for detection in detections:
            center = detection["center"]
            
            for lane_name, roi in lane_rois.items():
                # Check if center point is inside the lane ROI
                if cv2 and cv2.pointPolygonTest(np.array(roi, dtype=np.int32), center, False) >= 0:
                    lane_counts[lane_name] += 1
                    break  # Vehicle belongs to first matching lane
        
        logger.info(f"Lane counts: {lane_counts}")
        return lane_counts

    def draw_detections(
        self, 
        frame: np.ndarray, 
        detections: List[Dict],
        lane_rois: Optional[Dict[str, List[Tuple[int, int]]]] = None,
        lane_counts: Optional[Dict[str, int]] = None
    ) -> np.ndarray:
        """
        Draw bounding boxes and lane information on frame
        
        Args:
            frame: Input frame
            detections: List of vehicle detections
            lane_rois: Lane ROI polygons (optional)
            lane_counts: Vehicle counts per lane (optional)
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        
        # Draw lane ROIs if provided
        if lane_rois and cv2 is not None:
            for lane_name, roi in lane_rois.items():
                # Get lane color from config (default to green)
                color = (0, 255, 0)
                cv2.polylines(annotated, [np.array(roi, dtype=np.int32)], True, color, 2)
                
                # Draw lane name
                center_x = sum(p[0] for p in roi) // len(roi)
                center_y = sum(p[1] for p in roi) // len(roi)
                cv2.putText(annotated, lane_name, (center_x - 30, center_y), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
                # Draw count badge if provided
                if lane_counts and lane_name in lane_counts:
                    count = lane_counts[lane_name]
                    cv2.rectangle(annotated, (center_x - 25, center_y + 15), 
                                (center_x + 25, center_y + 35), (0, 0, 0), -1)
                    cv2.putText(annotated, str(count), (center_x - 10, center_y + 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Draw vehicle bounding boxes
        if cv2 is not None:
            for detection in detections:
                x1, y1, x2, y2 = detection["bbox"]
                class_name = detection["class"]
                confidence = detection["confidence"]
                
                # Color based on vehicle type
                color_map = {
                    "car": (0, 255, 0),
                    "motorcycle": (255, 0, 0),
                    "bus": (0, 0, 255),
                    "truck": (255, 255, 0)
                }
                color = color_map.get(class_name, (0, 255, 255))
                
                # Draw bounding box
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                
                # Draw label
                label = f"{class_name}: {confidence:.2f}"
                cv2.putText(annotated, label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return annotated


def load_lanes_config(config_path: str = "config/lanes.json") -> Dict:
    """
    Load lane configuration from JSON file
    
    Args:
        config_path: Path to lanes.json
        
    Returns:
        Dictionary with lane configuration
    """
    import json
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Extract ROI polygons
    lane_rois = {}
    for lane_name, lane_config in config["lanes"].items():
        lane_rois[lane_name] = [(p[0], p[1]) for p in lane_config["roi"]]
    
    return {
        "lane_rois": lane_rois,
        "timer_config": config["timer_config"],
        "congestion_thresholds": config["congestion_thresholds"],
        "video_config": config["video_config"]
    }
