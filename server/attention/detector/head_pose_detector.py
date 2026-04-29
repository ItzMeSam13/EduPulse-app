# attention/detector/head_pose_detector.py

import numpy as np
import cv2
from core.config import Config

class HeadPoseDetector:
    def __init__(self):
        # 3D model points of face landmarks
        self.model_points = np.array([
            (0.0, 0.0, 0.0),          # Nose tip - landmark 1
            (0.0, -330.0, -65.0),     # Chin - landmark 152
            (-225.0, 170.0, -135.0),  # Left eye corner - landmark 33
            (225.0, 170.0, -135.0),   # Right eye corner - landmark 263
            (-150.0, -150.0, -125.0), # Left mouth - landmark 61
            (150.0, -150.0, -125.0),  # Right mouth - landmark 291
        ], dtype=np.float64)

        self.landmark_ids = [1, 152, 33, 263, 61, 291]

    def get_angles(self, face_landmarks, frame_width, frame_height):
        image_points = []

        for idx in self.landmark_ids:
            lm = face_landmarks.landmark[idx]
            x = int(lm.x * frame_width)
            y = int(lm.y * frame_height)
            image_points.append((x, y))

        image_points = np.array(image_points, dtype=np.float64)

        focal_length = frame_width
        center = (frame_width / 2, frame_height / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1))

        success, rotation_vec, _ = cv2.solvePnP(
            self.model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return None

        rotation_mat, _ = cv2.Rodrigues(rotation_vec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rotation_mat)

        yaw   = angles[1]   # left/right
        pitch = angles[0]   # up/down
        roll  = angles[2]   # tilt

        return {"yaw": yaw, "pitch": pitch, "roll": roll}