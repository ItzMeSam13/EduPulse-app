# attention/detector/gaze_detector.py

from core.config import Config

class GazeDetector:
    # Iris landmark IDs
    LEFT_IRIS = [468, 469, 470, 471, 472]
    RIGHT_IRIS = [473, 474, 475, 476, 477]

    # Eye corner IDs
    LEFT_EYE = [33, 133]
    RIGHT_EYE = [362, 263]

    def get_gaze(self, face_landmarks):
        lm = face_landmarks.landmark

        # Left eye iris center
        left_iris_x = sum(lm[i].x for i in self.LEFT_IRIS) / len(self.LEFT_IRIS)

        # Left eye corners
        left_inner = lm[self.LEFT_EYE[1]].x
        left_outer = lm[self.LEFT_EYE[0]].x
        left_width = abs(left_inner - left_outer)

        # Ratio: 0.5 = center, <0.5 = left, >0.5 = right
        left_ratio = (left_iris_x - left_outer) / left_width if left_width > 0 else 0.5

        # Right eye iris center
        right_iris_x = sum(lm[i].x for i in self.RIGHT_IRIS) / len(self.RIGHT_IRIS)
        right_inner = lm[self.RIGHT_EYE[0]].x
        right_outer = lm[self.RIGHT_EYE[1]].x
        right_width = abs(right_inner - right_outer)

        right_ratio = (right_iris_x - right_outer) / right_width if right_width > 0 else 0.5

        avg_ratio = (left_ratio + right_ratio) / 2

        # Check if gaze is off center
        gaze_off = abs(avg_ratio - 0.5) > Config.GAZE_THRESHOLD

        return {"gaze_ratio": avg_ratio, "gaze_off": gaze_off}