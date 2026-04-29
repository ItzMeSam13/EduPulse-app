import mediapipe as mp
import numpy as np
from core.config import Config

NOSE_TIP = 1
LEFT_TEMPLE = 234
RIGHT_TEMPLE = 454

class SideConvoDetector:
  def __init__(self):
    self.face_mesh = mp.solutions.face_mesh.FaceMesh(
      static_image_mode=False,
      max_num_faces=1,
      refine_landmarks=True,
      min_detection_confidence=0.5,
      min_tracking_confidence=0.5
    )

  def _yaw_ratio(self, landmarks):
    nose = np.array([landmarks[NOSE_TIP].x, landmarks[NOSE_TIP].y])
    left = np.array([landmarks[LEFT_TEMPLE].x, landmarks[LEFT_TEMPLE].y])
    right = np.array([landmarks[RIGHT_TEMPLE].x, landmarks[RIGHT_TEMPLE].y])
    face_width = np.linalg.norm(right - left) + 1e-6
    left_dist = np.linalg.norm(nose - left)
    right_dist = np.linalg.norm(nose - right)
    return (left_dist - right_dist) / face_width

  def detect(self, frame: np.ndarray) -> bool:
    results = self.face_mesh.process(frame)
    if not results.multi_face_landmarks:
      return False
    lm = results.multi_face_landmarks[0].landmark
    ratio = self._yaw_ratio(lm)
    return abs(ratio) > 0.35