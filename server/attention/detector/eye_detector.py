# attention/detector/eye_detector.py

import math
from core.config import Config

class EyeDetector:
    # EAR landmark IDs
    LEFT_EYE  = [159, 145, 33, 133]   # top, bottom, left, right
    RIGHT_EYE = [386, 374, 362, 263]

    def __init__(self):
        self.closed_frame_count = 0

    def _ear(self, landmarks, ids, w, h):
        top    = landmarks[ids[0]]
        bottom = landmarks[ids[1]]
        left   = landmarks[ids[2]]
        right  = landmarks[ids[3]]

        vertical   = math.dist((top.x * w, top.y * h), (bottom.x * w, bottom.y * h))
        horizontal = math.dist((left.x * w, left.y * h), (right.x * w, right.y * h))

        return vertical / horizontal if horizontal > 0 else 0

    def get_eye_state(self, face_landmarks, frame_width, frame_height):
        lm = face_landmarks.landmark

        left_ear  = self._ear(lm, self.LEFT_EYE,  frame_width, frame_height)
        right_ear = self._ear(lm, self.RIGHT_EYE, frame_width, frame_height)
        avg_ear   = (left_ear + right_ear) / 2

        eyes_closed = avg_ear < Config.EAR_THRESHOLD

        if eyes_closed:
            self.closed_frame_count += 1
        else:
            self.closed_frame_count = 0

        # Ignore normal blinks
        is_blink = self.closed_frame_count <= Config.BLINK_FRAMES
        is_drowsy = self.closed_frame_count >= Config.DROWSY_FRAMES

        return {
            "ear": avg_ear,
            "eyes_closed": eyes_closed,
            "is_blink": is_blink,
            "is_drowsy": is_drowsy
        }