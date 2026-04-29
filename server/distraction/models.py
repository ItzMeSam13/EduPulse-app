from pydantic import BaseModel, Field

class DistractionMetrics(BaseModel):
  phone_detected: bool = Field(default=False)
  sleep_detected: bool = Field(default=False)
  side_convo_detected: bool = Field(default=False)
  yawn_detected: bool = Field(default=False)

class DistractionResponse(BaseModel):
  distraction_score: float = Field(default=0.0, ge=0.0, le=100.0)
  metrics: DistractionMetrics = Field(default_factory=DistractionMetrics)