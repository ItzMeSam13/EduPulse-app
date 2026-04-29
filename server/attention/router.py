# attention/router.py

import time
import cv2
from fastapi import APIRouter, HTTPException
from attention.models import AttentionResponse, FaceResult
from attention.detector.face_detector import FaceDetector
from attention.detector.head_pose_detector import HeadPoseDetector
from attention.detector.gaze_detector import GazeDetector
from attention.detector.eye_detector import EyeDetector
from attention.scorer import AttentionScorer
from video.stream_handler import StreamHandler
from video.frame_extractor import FrameExtractor
from core.config import Config

router = APIRouter()

# Module-level instances
stream = StreamHandler()
extractor = FrameExtractor()
face_detector = FaceDetector()
head_pose = HeadPoseDetector()
gaze_detector = GazeDetector()
eye_detectors = {}   # face_id -> EyeDetector instance
scorer = AttentionScorer()

# Dip tracking
dip_start_time = None

@router.post("/start")
def start_attention():
    stream.start()
    return {"status": "started"}

@router.post("/stop")
def stop_attention():
    stream.stop()
    face_detector.close()
    return {"status": "stopped"}

@router.get("/score", response_model=AttentionResponse)
def get_attention_score():
    frame = stream.read_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="No frame available")

    rgb_frame = extractor.extract(frame)
    h, w = rgb_frame.shape[:2]

    faces = face_detector.detect(rgb_frame)

    if not faces:
        return AttentionResponse(
            faces_visible=0,
            class_score=None,
            class_state=None,
            per_face=[],
            dip_alert=False,
            timestamp=time.time()
        )

    per_face_results = []
    all_scores = []

    for face_id, face_landmarks in enumerate(faces):
        # Get each signal
        head_angles = head_pose.get_angles(face_landmarks, w, h)
        gaze = gaze_detector.get_gaze(face_landmarks)

        if face_id not in eye_detectors:
            eye_detectors[face_id] = EyeDetector()
        eye_state = eye_detectors[face_id].get_eye_state(face_landmarks, w, h)

        # Score this face
        face_score = scorer.score(face_id, head_angles, gaze, eye_state)
        face_state = scorer.get_state(face_score, eye_state["is_drowsy"])

        all_scores.append(face_score)

        per_face_results.append(FaceResult(
            face_id=face_id + 1,
            score=face_score,
            state=face_state,
            yaw=round(head_angles["yaw"], 2) if head_angles else None,
            pitch=round(head_angles["pitch"], 2) if head_angles else None,
            ear=round(eye_state["ear"], 3),
            gaze_off=gaze["gaze_off"]
        ))

    # Class score
    cls_score = scorer.class_score(all_scores)
    cls_state = scorer.get_state(cls_score, False)

    # Dip alert
    global dip_start_time
    dip_alert = False
    if cls_score is not None and cls_score < Config.DIP_THRESHOLD:
        if dip_start_time is None:
            dip_start_time = time.time()
        elif time.time() - dip_start_time >= Config.DIP_DURATION:
            dip_alert = True
    else:
        dip_start_time = None

    return AttentionResponse(
        faces_visible=len(faces),
        class_score=cls_score,
        class_state=cls_state,
        per_face=per_face_results,
        dip_alert=dip_alert,
        timestamp=time.time()
    )