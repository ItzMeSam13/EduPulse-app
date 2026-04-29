import mediapipe as mp
import numpy as np
from core.config import Config

MOUTH_OUTER = [61, 291, 17, 0]

class YawnDetector:
  def __init__(self):
    self.face_mesh = mp.solutions.face_mesh.FaceMesh(
      static_image_mode=False,
      max_num_faces=1,
      refine_landmarks=True,
      min_detection_confidence=0.5,
      min_tracking_confidence=0.5
    )
    self.counter = 0

  def _mar(self, landmarks, w, h):
    pts = np.array([[landmarks[i].x * w, landmarks[i].y * h] for i in MOUTH_OUTER])
    A = np.linalg.norm(pts[1] - pts[3])
    B = np.linalg.norm(pts[0] - pts[2])
    return A / (B + 1e-6)

  def detect(self, frame: np.ndarray) -> bool:
    h, w = frame.shape[:2]
    results = self.face_mesh.process(frame)
    if not results.multi_face_landmarks:
      return False
    lm = results.multi_face_landmarks[0].landmark
    mar = self._mar(lm, w, h)
    if mar > Config.MAR_THRESHOLD:
      self.counter += 1
    else:
      self.counter = 0
    return self.counter >= Config.YAWN_CONSEC_FRAMES