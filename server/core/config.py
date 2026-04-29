# core/config.py

class Config:
    # Camera
    CAMERA_INDEX = 0
    FRAME_WIDTH = 640
    FRAME_HEIGHT = 480
    FPS_TARGET = 1  # 1 frame per second for processing

    # MediaPipe
    MIN_DETECTION_CONFIDENCE = 0.5
    MIN_TRACKING_CONFIDENCE = 0.5
    MAX_NUM_FACES = 10

    # Head Pose Thresholds
    YAW_THRESHOLD = 15       # degrees left/right
    PITCH_THRESHOLD = -10    # degrees down
    ROLL_THRESHOLD = 20      # degrees tilt

    # Gaze Thresholds
    GAZE_THRESHOLD = 0.35    # iris off-center ratio

    # Eye Openness (EAR)
    EAR_THRESHOLD = 0.20     # below = eyes closing
    BLINK_FRAMES = 3         # blinks under 3 frames = normal blink, ignore
    DROWSY_FRAMES = 10       # eyes closed 10+ frames = drowsy

    # Scoring
    HEAD_YAW_PENALTY = 25
    HEAD_PITCH_PENALTY = 20
    GAZE_PENALTY = 20
    EAR_PENALTY = 20

    # Smoothing
    SMOOTH_ALPHA = 0.7       # weight for previous score
    SMOOTH_WINDOW = 5        # rolling window size

    # Dip Alert
    DIP_THRESHOLD = 60       # class score below 60 = dip
    DIP_DURATION = 10        # seconds below threshold before alert

    #Distraction Thresholds
    MAR_THRESHOLD = 0.6
    YAWN_CONSEC_FRAMES = 20
    SLEEP_CONSEC_FRAMES = 48

    DISTRACTION_PENALTIES = {
    "PHONE": 40,
    "SLEEP": 35,
    "SIDE_CONVO": 25,
    "YAWN": 10,
    }