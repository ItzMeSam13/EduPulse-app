import numpy as np
from core.config import Config
from distraction.detector import (
  SleepDetector,
  YawnDetector,
  SideConvoDetector,
  PhoneDetector,
)
from distraction.models import DistractionMetrics, DistractionResponse

class DistractionScorer:
  def __init__(self):
    self.sleep_detector = SleepDetector()
    self.yawn_detector = YawnDetector()
    self.side_convo_detector = SideConvoDetector()
    self.phone_detector = PhoneDetector()
    self.previous_score = 100.0

  def score(self, frame: np.ndarray) -> DistractionResponse:
    metrics = DistractionMetrics(
      sleep_detected=self.sleep_detector.detect(frame),
      yawn_detected=self.yawn_detector.detect(frame),
      side_convo_detected=self.side_convo_detector.detect(frame),
      phone_detected=self.phone_detector.detect(frame),
    )

    flag_map = {
      "SLEEP": metrics.sleep_detected,
      "YAWN": metrics.yawn_detected,
      "SIDE_CONVO": metrics.side_convo_detected,
      "PHONE": metrics.phone_detected,
    }

    total_penalty = sum(
      Config.DISTRACTION_PENALTIES[key]
      for key, triggered in flag_map.items()
      if triggered
    )

    raw_score = float(max(0, 100 - total_penalty))

    smoothed_score = (Config.SMOOTH_ALPHA * self.previous_score + 
                     (1 - Config.SMOOTH_ALPHA) * raw_score)
    
    self.previous_score = smoothed_score

    return DistractionResponse(
      distraction_score=round(smoothed_score, 2),
      metrics=metrics,
    )