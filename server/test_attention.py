# test_attention.py

import cv2
import mediapipe as mp
import numpy as np
import math
from core.config import Config

# Init MediaPipe
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=10,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def get_ear(landmarks, ids, w, h):
    top    = landmarks[ids[0]]
    bottom = landmarks[ids[1]]
    left   = landmarks[ids[2]]
    right  = landmarks[ids[3]]
    vertical   = math.dist((top.x*w, top.y*h), (bottom.x*w, bottom.y*h))
    horizontal = math.dist((left.x*w, left.y*h), (right.x*w, right.y*h))
    return vertical / horizontal if horizontal > 0 else 0

# Open webcam
cap = cv2.VideoCapture(0)

print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    class_scores = []

    if results.multi_face_landmarks:
        for face_id, face_landmarks in enumerate(results.multi_face_landmarks):
            lm = face_landmarks.landmark

            # ── HEAD POSE ──
            model_points = np.array([
                (0.0, 0.0, 0.0),
                (0.0, -330.0, -65.0),
                (-225.0, 170.0, -135.0),
                (225.0, 170.0, -135.0),
                (-150.0, -150.0, -125.0),
                (150.0, -150.0, -125.0),
            ], dtype=np.float64)

            ids = [1, 152, 33, 263, 61, 291]
            image_points = np.array([
                (int(lm[i].x * w), int(lm[i].y * h)) for i in ids
            ], dtype=np.float64)

            focal = w
            cam_matrix = np.array([
                [focal, 0, w/2],
                [0, focal, h/2],
                [0, 0, 1]
            ], dtype=np.float64)

            success, rvec, _ = cv2.solvePnP(
                model_points, image_points,
                cam_matrix, np.zeros((4,1)),
                flags=cv2.SOLVEPNP_ITERATIVE
            )

            yaw = pitch = 0
            if success:
                rmat, _ = cv2.Rodrigues(rvec)
                angles, *_ = cv2.RQDecomp3x3(rmat)
                yaw   = angles[1]
                pitch = angles[0]

            # ── EAR ──
            left_ear  = get_ear(lm, [159, 145, 33, 133], w, h)
            right_ear = get_ear(lm, [386, 374, 362, 263], w, h)
            avg_ear   = (left_ear + right_ear) / 2

            # ── GAZE ──
            left_iris_x  = sum(lm[i].x for i in [468,469,470,471,472]) / 5
            left_outer   = lm[33].x
            left_inner   = lm[133].x
            left_width   = abs(left_inner - left_outer)
            left_ratio   = (left_iris_x - left_outer) / left_width if left_width > 0 else 0.5

            right_iris_x = sum(lm[i].x for i in [473,474,475,476,477]) / 5
            right_outer  = lm[263].x
            right_inner  = lm[362].x
            right_width  = abs(right_inner - right_outer)
            right_ratio  = (right_iris_x - right_outer) / right_width if right_width > 0 else 0.5

            avg_ratio  = (left_ratio + right_ratio) / 2
            gaze_off   = abs(avg_ratio - 0.5) > Config.GAZE_THRESHOLD

            # ── SCORE ──
            score = 100
            if abs(yaw)   > Config.YAW_THRESHOLD:   score -= Config.HEAD_YAW_PENALTY
            if pitch       < Config.PITCH_THRESHOLD: score -= Config.HEAD_PITCH_PENALTY
            if gaze_off:                             score -= Config.GAZE_PENALTY
            if avg_ear     < Config.EAR_THRESHOLD:   score -= Config.EAR_PENALTY
            score = max(0, min(100, score))
            class_scores.append(score)

            # ── STATE ──
            if avg_ear < Config.EAR_THRESHOLD:
                state = "Drowsy"
                color = (0, 0, 255)      # Red
            elif score >= 75:
                state = "Attentive"
                color = (0, 255, 0)      # Green
            elif score >= 50:
                state = "Moderate"
                color = (0, 255, 255)    # Yellow
            else:
                state = "Distracted"
                color = (0, 165, 255)    # Orange

            # ── DRAW FACE BOX ──
            x_coords = [int(lm[i].x * w) for i in range(468)]
            y_coords = [int(lm[i].y * h) for i in range(468)]
            x1, y1 = min(x_coords), min(y_coords)
            x2, y2 = max(x_coords), max(y_coords)

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # ── FACE LABEL ──
            label = f"Face {face_id+1} | {score}% | {state}"
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

            # ── DEBUG INFO ──
            debug = f"Yaw:{yaw:.1f} Pitch:{pitch:.1f} EAR:{avg_ear:.2f} Gaze:{'off' if gaze_off else 'on'}"
            cv2.putText(frame, debug, (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

    # ── CLASS SCORE TOP RIGHT ──
    if class_scores:
        cls = round(sum(class_scores) / len(class_scores))
        if cls >= 75:
            cls_color = (0, 255, 0)
            cls_state = "Good"
        elif cls >= 50:
            cls_color = (0, 255, 255)
            cls_state = "Moderate"
        else:
            cls_color = (0, 0, 255)
            cls_state = "Low"

        cv2.putText(frame, f"Class: {cls}% {cls_state}",
                    (w - 220, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, cls_color, 2)
        cv2.putText(frame, f"Faces: {len(class_scores)}",
                    (w - 220, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
    else:
        cv2.putText(frame, "No faces detected",
                    (w - 220, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)

    cv2.imshow("EduPulse - Attention Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
face_mesh.close()