import mediapipe as mp
import numpy as np
from core.config import Config

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

class SleepDetector:
  def __init__(self):
    self.face_mesh = mp.solutions.face_mesh.FaceMesh(
      static_image_mode=False,
      max_num_faces=1,
      refine_landmarks=True,
      min_detection_confidence=0.5,
      min_tracking_confidence=0.5
    )
    self.counter = 0

  def _ear(self, landmarks, indices, w, h):
    pts = np.array([[landmarks[i].x * w, landmarks[i].y * h] for i in indices])
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    return (A + B) / (2.0 * C)

  def detect(self, frame: np.ndarray) -> bool:
    h, w = frame.shape[:2]
    results = self.face_mesh.process(frame)
    if not results.multi_face_landmarks:
      return False
    lm = results.multi_face_landmarks[0].landmark
    left = self._ear(lm, LEFT_EYE, w, h)
    right = self._ear(lm, RIGHT_EYE, w, h)
    avg = (left + right) / 2.0
    if avg < Config.EAR_THRESHOLD:
      self.counter += 1
    else:
      self.counter = 0
    return self.counter >= Config.SLEEP_CONSEC_FRAMES