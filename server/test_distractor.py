import cv2
import math
import time
import numpy as np
import mediapipe as mp
from core.config import Config
from distraction.scorer import DistractionScorer
from video.stream_handler import StreamHandler
from video.frame_extractor import FrameExtractor

# ── 1. Initialization ──────────────────────────────────────────────
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=10,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

stream = StreamHandler()
extractor = FrameExtractor()
scorer = DistractionScorer()

stream.start()
print("EduPulse Tracker started. Press Q to quit.\n")

# ── 2. Helper Functions (Math-based Accuracy) ──────────────────────
def get_ear(landmarks, ids, w, h):
    # 6-point Eye Aspect Ratio for highly accurate blink/sleep detection
    pts = [np.array([landmarks[i].x * w, landmarks[i].y * h]) for i in ids]
    v1 = np.linalg.norm(pts[1] - pts[5])
    v2 = np.linalg.norm(pts[2] - pts[4])
    h1 = np.linalg.norm(pts[0] - pts[3])
    return (v1 + v2) / (2.0 * h1) if h1 > 0 else 0

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

def get_mar(landmarks, w, h):
    # Mouth Aspect Ratio for highly accurate yawn detection
    top_lip = np.array([landmarks[13].x * w, landmarks[13].y * h])
    bottom_lip = np.array([landmarks[14].x * w, landmarks[14].y * h])
    left_corner = np.array([landmarks[78].x * w, landmarks[78].y * h])
    right_corner = np.array([landmarks[308].x * w, landmarks[308].y * h])
    
    vertical = np.linalg.norm(top_lip - bottom_lip)
    horizontal = np.linalg.norm(left_corner - right_corner)
    return vertical / horizontal if horizontal > 0 else 0

# ── 3. Main Loop ───────────────────────────────────────────────────
frame_count = 0
distraction_result = None
history = {} # Keeps scores stable (prevents jumping numbers)

try:
    while True:
        raw_frame = stream.read_frame()
        if raw_frame is None:
            continue

        frame = raw_frame.copy()
        h, w = frame.shape[:2]
        frame_count += 1

        # --- A. EXTERNAL AI SCORER (For Phone & Side Convo ONLY) ---
        if frame_count % 3 == 0:
            rgb_frame = extractor.extract(raw_frame)
            if rgb_frame is not None:
                try:
                    distraction_result = scorer.score(rgb_frame)
                except Exception:
                    pass

        # Parse AI results safely
        phone_detected = distraction_result.metrics.phone_detected if distraction_result else False
        side_detected = distraction_result.metrics.side_convo_detected if distraction_result else False

        # --- B. MEDIAPIPE (For Attention, Yawn, Sleep) ---
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        class_scores = []
        is_yawning = False
        is_sleeping = False

        if results.multi_face_landmarks:
            for face_id, face_landmarks in enumerate(results.multi_face_landmarks):
                lm = face_landmarks.landmark

                # 1. HEAD POSE
                model_points = np.array([
                    (0.0, 0.0, 0.0), (0.0, -330.0, -65.0), (-225.0, 170.0, -135.0),
                    (225.0, 170.0, -135.0), (-150.0, -150.0, -125.0), (150.0, -150.0, -125.0)
                ], dtype=np.float64)

                ids = [1, 152, 33, 263, 61, 291]
                image_points = np.array([(int(lm[i].x * w), int(lm[i].y * h)) for i in ids], dtype=np.float64)
                cam_matrix = np.array([[w, 0, w/2], [0, w, h/2], [0, 0, 1]], dtype=np.float64)

                success, rvec, _ = cv2.solvePnP(model_points, image_points, cam_matrix, np.zeros((4,1)), flags=cv2.SOLVEPNP_ITERATIVE)
                
                yaw = pitch = 0
                if success:
                    rmat, _ = cv2.Rodrigues(rvec)
                    angles, *_ = cv2.RQDecomp3x3(rmat)
                    yaw   = angles[1]
                    pitch = angles[0]
                    # Fix 180-degree flip bug
                    if pitch > 90: pitch -= 180
                    elif pitch < -90: pitch += 180

                # 2. EYE ASPECT RATIO (Sleep)
                left_ear  = get_ear(lm, LEFT_EYE, w, h)
                right_ear = get_ear(lm, RIGHT_EYE, w, h)
                avg_ear   = (left_ear + right_ear) / 2
                is_sleeping = avg_ear < Config.EAR_THRESHOLD

                # 3. MOUTH ASPECT RATIO (Yawn)
                mar = get_mar(lm, w, h)
                is_yawning = mar > 0.6  # Threshold for yawn

                # 4. GAZE
                left_iris_x  = sum(lm[i].x for i in [468,469,470,471,472]) / 5
                left_width   = max(abs(lm[133].x - lm[33].x), 0.001)
                left_ratio   = (left_iris_x - lm[33].x) / left_width

                right_iris_x = sum(lm[i].x for i in [473,474,475,476,477]) / 5
                right_width  = max(abs(lm[362].x - lm[263].x), 0.001)
                right_ratio  = (right_iris_x - lm[263].x) / right_width

                avg_ratio = (left_ratio + right_ratio) / 2
                gaze_off  = abs(avg_ratio - 0.5) > Config.GAZE_THRESHOLD

                # 5. CALCULATE RAW ATTENTION SCORE
                raw_score = 100
                if abs(yaw) > Config.YAW_THRESHOLD:     raw_score -= Config.HEAD_YAW_PENALTY
                if pitch    < Config.PITCH_THRESHOLD:   raw_score -= Config.HEAD_PITCH_PENALTY
                if gaze_off:                            raw_score -= Config.GAZE_PENALTY
                if is_sleeping:                         raw_score -= Config.EAR_PENALTY
                if is_yawning:                          raw_score -= Config.DISTRACTION_PENALTIES.get("YAWN", 20)
                
                # Apply External AI Penalties
                if phone_detected:                      raw_score -= Config.DISTRACTION_PENALTIES.get("PHONE", 30)
                if side_detected:                       raw_score -= Config.DISTRACTION_PENALTIES.get("SIDE_CONVO", 20)

                raw_score = max(0, min(100, raw_score))

                # 6. TEMPORAL SMOOTHING
                if face_id not in history: history[face_id] = {'score': raw_score, 'ear': avg_ear}
                ema_factor = 0.3 
                score = int((history[face_id]['score'] * (1 - ema_factor)) + (raw_score * ema_factor))
                history[face_id]['score'] = score
                class_scores.append(score)

                # 7. STATE & COLORS
                if is_sleeping:       state, color = "Sleeping", (0, 0, 255)
                elif is_yawning:      state, color = "Yawning", (0, 100, 255)
                elif phone_detected:  state, color = "Phone!", (0, 0, 200)
                elif score >= 75:     state, color = "Attentive", (0, 255, 0)
                elif score >= 50:     state, color = "Moderate", (0, 255, 255)
                else:                 state, color = "Distracted", (0, 165, 255)

                # 8. DRAW BOUNDING BOX
                x_coords = [int(lm[i].x * w) for i in range(468)]
                y_coords = [int(lm[i].y * h) for i in range(468)]
                x1, y1 = min(x_coords), min(y_coords)
                x2, y2 = max(x_coords), max(y_coords)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"Face {face_id+1} | {score}% | {state}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)


        # --- C. DRAW UI PANELS & TERMINAL ---
        current_attention = class_scores[0] if class_scores else 100
        true_distraction = 100 - current_attention

        # Top Right: Attention Panel
        if class_scores:
            cls = round(sum(class_scores) / len(class_scores))
            cls_color = (0, 255, 0) if cls >= 75 else (0, 255, 255) if cls >= 50 else (0, 0, 255)
            cls_state = "Good" if cls >= 75 else "Moderate" if cls >= 50 else "Low"

            cv2.rectangle(frame, (w-230, 0), (w, 75), (0,0,0), -1)
            cv2.rectangle(frame, (w-230, 0), (w, 75), cls_color, 2)
            cv2.putText(frame, f"Class: {cls}% {cls_state}", (w - 220, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, cls_color, 2)
            cv2.putText(frame, f"Faces: {len(class_scores)}", (w - 220, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,255,255), 1)

        # Bottom Left: Distraction Panel
        d_color = (0,0,255) if true_distraction > 50 else (0,255,0)
        cv2.rectangle(frame, (0, h-100), (320, h), (0,0,0), -1)
        cv2.rectangle(frame, (0, h-100), (320, h), d_color, 2)
        
        cv2.putText(frame, f"Distraction: {true_distraction}%", (8, h-75), cv2.FONT_HERSHEY_SIMPLEX, 0.65, d_color, 2)
        cv2.putText(frame, f"Sleep: {is_sleeping}  |  Yawn: {is_yawning}", (8, h-45), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
        cv2.putText(frame, f"Phone: {phone_detected}  |  Side: {side_detected}", (8, h-20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)

        # Print to Terminal exactly how you requested
        if frame_count % 3 == 0:
            print(f"Tracking | Score: {current_attention}% | "
                  f"Sleep: {is_sleeping} | Yawn: {is_yawning} | "
                  f"Phone: {phone_detected} | Side: {side_detected}")

        cv2.imshow("EduPulse Unified Tracker", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        time.sleep(0.01)

except KeyboardInterrupt:
    print("\nStopping...")

finally:
    stream.stop()
    cv2.destroyAllWindows()
    face_mesh.close()