# attention/scorer.py

from core.config import Config

class AttentionScorer:
    def __init__(self):
        self.previous_scores = {}  # face_id -> last score

    def score(self, face_id, head_angles, gaze, eye_state):
        score = 100

        if head_angles:
            if abs(head_angles["yaw"]) > Config.YAW_THRESHOLD:
                score -= Config.HEAD_YAW_PENALTY
            if head_angles["pitch"] < Config.PITCH_THRESHOLD:
                score -= Config.HEAD_PITCH_PENALTY

        if gaze and gaze["gaze_off"]:
            score -= Config.GAZE_PENALTY

        if eye_state and eye_state["eyes_closed"] and not eye_state["is_blink"]:
            score -= Config.EAR_PENALTY

        score = max(0, min(100, score))

        # Temporal smoothing
        if face_id in self.previous_scores:
            score = (Config.SMOOTH_ALPHA * self.previous_scores[face_id] +
                     (1 - Config.SMOOTH_ALPHA) * score)

        self.previous_scores[face_id] = score

        return round(score)

    def get_state(self, score, is_drowsy):
        if is_drowsy:
            return "Drowsy"
        elif score >= 75:
            return "Attentive"
        elif score >= 50:
            return "Moderate"
        else:
            return "Distracted"

    def class_score(self, all_scores):
        if not all_scores:
            return None
        return round(sum(all_scores) / len(all_scores))