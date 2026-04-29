# core/config.py

# MediaPipe settings
MAX_FACES = 30
DETECTION_CONFIDENCE = 0.5
TRACKING_CONFIDENCE = 0.5

# Head pose thresholds (degrees)
YAW_THRESHOLD = 15        # head turned left/right
PITCH_THRESHOLD = 10      # head tilted down/up
ROLL_THRESHOLD = 20       # head tilted sideways

# Gaze thresholds
GAZE_DEVIATION_THRESHOLD = 0.15   # iris deviation ratio

# Eye openness (EAR)
EAR_THRESHOLD = 0.20              # below = eyes closed
BLINK_FRAMES = 3                  # frames to ignore (normal blink)
DROWSY_FRAMES = 10                # frames = drowsy (2 sec at 5fps)

# Smoothing
SMOOTHING_FACTOR = 0.7            # higher = smoother but slower
FRAMES_PER_SECOND = 5             # how many frames processed/sec

# Engagement thresholds
ATTENTIVE_THRESHOLD = 75          # score >= 75 = attentive
MODERATE_THRESHOLD = 50           # score >= 50 = moderate
DIP_THRESHOLD = 60                # below this = dip alert
DIP_DURATION_SEC = 10             # seconds before alert triggers
PEAK_THRESHOLD = 85               # score >= 85 = peak moment

# Score deductions
DEDUCTION_HEAD_YAW = 25
DEDUCTION_HEAD_PITCH = 20
DEDUCTION_GAZE_OFF = 20
DEDUCTION_EYES_CLOSED = 20