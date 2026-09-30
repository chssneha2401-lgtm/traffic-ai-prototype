"""
ANPR (Automatic Number Plate Recognition) Module
Extracts license plates from detected vehicles using EasyOCR
"""

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np
from typing import List, Dict, Optional, Tuple
import logging

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logging.warning("EasyOCR not available. ANPR functionality will be disabled.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ANPRSystem:
    def __init__(self, languages: List[str] = ['en'], gpu: bool = False):
        """
        Initialize ANPR system with EasyOCR
        
        Args:
            languages: List of language codes for OCR
            gpu: Whether to use GPU acceleration
        """
        self.languages = languages
        self.gpu = gpu
        self.reader = None
        self.plate_log = []
        
        if EASYOCR_AVAILABLE:
            logger.info("Initializing EasyOCR reader...")
            try:
                self.reader = easyocr.Reader(languages, gpu=gpu)
                logger.info("EasyOCR reader initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR: {e}")
                self.reader = None
        else:
            logger.warning("ANPR disabled - EasyOCR not installed")

    def extract_plate_region(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """
        Extract potential license plate region from vehicle bounding box
        
        Args:
            frame: Input frame
            bbox: Vehicle bounding box (x1, y1, x2, y2)
            
        Returns:
            Cropped plate region or None
        """
        x1, y1, x2, y2 = bbox
        
        # Heuristic: license plate is typically in lower portion of vehicle
        # and occupies approximately 20-30% of vehicle width
        vehicle_width = x2 - x1
        vehicle_height = y2 - y1
        
        plate_width = int(vehicle_width * 0.4)
        plate_height = int(vehicle_height * 0.15)
        
        plate_x1 = x1 + int(vehicle_width * 0.3)
        plate_y1 = y2 - int(vehicle_height * 0.25)
        plate_x2 = plate_x1 + plate_width
        plate_y2 = plate_y1 + plate_height
        
        # Ensure coordinates are within frame bounds
        frame_height, frame_width = frame.shape[:2]
        plate_x1 = max(0, plate_x1)
        plate_y1 = max(0, plate_y1)
        plate_x2 = min(frame_width, plate_x2)
        plate_y2 = min(frame_height, plate_y2)
        
        if plate_x2 <= plate_x1 or plate_y2 <= plate_y1:
            return None
        
        plate_region = frame[plate_y1:plate_y2, plate_x1:plate_x2]
        
        # Apply preprocessing to enhance OCR
        plate_region = self._preprocess_plate(plate_region)
        
        return plate_region

    def _preprocess_plate(self, plate: np.ndarray) -> np.ndarray:
        """
        Preprocess plate image for better OCR
        
        Args:
            plate: Input plate image
            
        Returns:
            Preprocessed plate image
        """
        if cv2 is None:
            return plate
            
        # Convert to grayscale
        if len(plate.shape) == 3:
            plate = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding
        _, plate = cv2.threshold(plate, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        plate = cv2.medianBlur(plate, 3)
        
        return plate

    def recognize_plate(self, plate_image: np.ndarray) -> Optional[str]:
        """
        Recognize text from license plate image
        
        Args:
            plate_image: Preprocessed plate image
            
        Returns:
            Recognized plate text or None
        """
        if self.reader is None:
            return None
        
        try:
            results = self.reader.readtext(plate_image)
            
            if not results:
                return None
            
            # Get the text with highest confidence
            best_result = max(results, key=lambda x: x[2])
            text = best_result[0]
            confidence = best_result[2]
            
            # Filter low confidence results
            if confidence < 0.5:
                return None
            
            # Clean text (remove spaces, uppercase)
            text = text.replace(" ", "").upper()
            
            # Basic validation (Indian plates typically have specific format)
            # This is a simple heuristic
            if len(text) < 5 or len(text) > 15:
                return None
            
            logger.info(f"Plate recognized: {text} (confidence: {confidence:.2f})")
            return text
            
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return None

    def process_vehicle(
        self, 
        frame: np.ndarray, 
        bbox: Tuple[int, int, int, int],
        lane: str,
        timestamp: str
    ) -> Optional[Dict]:
        """
        Process a vehicle for license plate recognition
        
        Args:
            frame: Input frame
            bbox: Vehicle bounding box
            lane: Lane name
            timestamp: Current timestamp
            
        Returns:
            Dictionary with plate information or None
        """
        # Extract plate region
        plate_image = self.extract_plate_region(frame, bbox)
        if plate_image is None:
            return None
        
        # Recognize plate
        plate_text = self.recognize_plate(plate_image)
        if plate_text is None:
            return None
        
        # Log the recognition
        plate_info = {
            "plate_number": plate_text,
            "lane": lane,
            "timestamp": timestamp,
            "confidence": 0.8  # Placeholder confidence
        }
        
        self.plate_log.append(plate_info)
        
        # Keep log size manageable
        if len(self.plate_log) > 100:
            self.plate_log.pop(0)
        
        return plate_info

    def get_plate_log(self) -> List[Dict]:
        """
        Get the license plate recognition log
        
        Returns:
            List of plate recognition entries
        """
        return self.plate_log

    def clear_log(self):
        """Clear the plate recognition log"""
        self.plate_log = []
        logger.info("Plate log cleared")

    def draw_plate_boxes(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """
        Draw license plate regions on frame (for visualization)
        
        Args:
            frame: Input frame
            detections: List of vehicle detections
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        
        if cv2 is None:
            return annotated
            
        for detection in detections:
            bbox = detection["bbox"]
            plate_region = self.extract_plate_region(frame, bbox)
            
            if plate_region is not None:
                # Draw rectangle around estimated plate location
                x1, y1, x2, y2 = bbox
                vehicle_width = x2 - x1
                vehicle_height = y2 - y1
                
                plate_x1 = x1 + int(vehicle_width * 0.3)
                plate_y1 = y2 - int(vehicle_height * 0.25)
                plate_width = int(vehicle_width * 0.4)
                plate_height = int(vehicle_height * 0.15)
                
                cv2.rectangle(annotated, 
                            (plate_x1, plate_y1),
                            (plate_x1 + plate_width, plate_y1 + plate_height),
                            (0, 0, 255), 2)
                cv2.putText(annotated, "PLATE", (plate_x1, plate_y1 - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        return annotated


# Mock ANPR for when EasyOCR is not available
class MockANPRSystem:
    """Mock ANPR system for testing without EasyOCR"""
    
    def __init__(self):
        self.plate_log = []
        logger.info("Mock ANPR system initialized")
    
    def process_vehicle(self, frame, bbox, lane, timestamp):
        """Generate mock plate numbers"""
        import random
        import time
        
        # Generate random Indian-style plate numbers
        states = ["DL", "MH", "KA", "TN", "UP", "GJ"]
        state = random.choice(states)
        numbers = random.randint(1, 99)
        letters = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
        last_numbers = random.randint(1000, 9999)
        
        plate_text = f"{state}-{numbers:02d}-{letters}-{last_numbers:04d}"
        
        plate_info = {
            "plate_number": plate_text,
            "lane": lane,
            "timestamp": timestamp,
            "confidence": random.uniform(0.7, 0.95)
        }
        
        self.plate_log.append(plate_info)
        
        if len(self.plate_log) > 100:
            self.plate_log.pop(0)
        
        return plate_info
    
    def get_plate_log(self):
        return self.plate_log
    
    def clear_log(self):
        self.plate_log = []
    
    def draw_plate_boxes(self, frame, detections):
        return frame


def get_anpr_system(use_mock: bool = False) -> object:
    """
    Get ANPR system (real or mock based on availability)
    
    Args:
        use_mock: Force use of mock system
        
    Returns:
        ANPR system instance
    """
    if use_mock or not EASYOCR_AVAILABLE:
        logger.info("Using mock ANPR system")
        return MockANPRSystem()
    else:
        return ANPRSystem()
