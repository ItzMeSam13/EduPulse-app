import time
from fastapi import APIRouter, HTTPException
from distraction.models import DistractionResponse
from distraction.scorer import DistractionScorer
from video.stream_handler import StreamHandler
from video.frame_extractor import FrameExtractor

router = APIRouter()

stream = StreamHandler()
extractor = FrameExtractor()
scorer = DistractionScorer()

@router.post("/start")
def start_distraction():
  stream.start()
  return {"status": "started"}

@router.post("/stop")
def stop_distraction():
  stream.stop()
  return {"status": "stopped"}

@router.get("/score", response_model=DistractionResponse)
def get_distraction_score():
  frame = stream.read_frame()
  if frame is None:
    raise HTTPException(status_code=503, detail="No frame available")

  rgb_frame = extractor.extract(frame)
  result = scorer.score(rgb_frame)
  
  return result