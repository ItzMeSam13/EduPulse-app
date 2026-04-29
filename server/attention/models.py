# attention/models.py

from pydantic import BaseModel
from typing import List, Optional

class FaceResult(BaseModel):
    face_id: int
    score: int                  # 0-100
    state: str                  # Attentive / Moderate / Distracted / Drowsy
    yaw: Optional[float] = None
    pitch: Optional[float] = None
    ear: Optional[float] = None
    gaze_off: Optional[bool] = None

class AttentionResponse(BaseModel):
    faces_visible: int
    class_score: Optional[int]  # None if no faces
    class_state: Optional[str]
    per_face: List[FaceResult]
    dip_alert: bool
    timestamp: float