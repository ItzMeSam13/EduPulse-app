import numpy as np
from ultralytics import YOLO

PHONE_CLASS_ID = 67
CONFIDENCE_THRESHOLD = 0.5

class PhoneDetector:
  def __init__(self):
    self.model = YOLO("yolov8n.pt")

  def detect(self, frame: np.ndarray) -> bool:
    results = self.model(frame, verbose=False)
    for result in results:
      for box in result.boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])
        if cls == PHONE_CLASS_ID and conf >= CONFIDENCE_THRESHOLD:
          return True
    return False