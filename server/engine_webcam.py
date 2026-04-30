# engine_webcam.py — Webcam version of engine.py
# Fixed: frame skipping, lower resolution, YOLO throttled, no GUI freeze

import cv2
import time
import queue
import threading
import numpy as np
import mediapipe as mp
from ultralytics import YOLO
from core.config import Config

# ── Shared State ───────────────────────────────────────────────────
metrics_queue = queue.Queue(maxsize=100)
_stop_flag    = threading.Event()
_thread       = None

# ── MediaPipe Setup ────────────────────────────────────────────────
mp_face_mesh = mp.solutions.face_mesh

LEFT_EYE  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

MODEL_POINTS = np.array([
    (0.0,    0.0,    0.0),
    (0.0,  -330.0,  -65.0),
    (-225.0, 170.0, -135.0),
    (225.0,  170.0, -135.0),
    (-150.0,-150.0, -125.0),
    (150.0, -150.0, -125.0),
], dtype=np.float64)
POSE_IDS      = [1, 152, 33, 263, 61, 291]
MAR_THRESHOLD = 0.6
EMA_FACTOR    = 0.3

# ── Helper Functions ───────────────────────────────────────────────
def get_ear_6pt(lm, ids, w, h):
    pts = [np.array([lm[i].x * w, lm[i].y * h]) for i in ids]
    v1  = np.linalg.norm(pts[1] - pts[5])
    v2  = np.linalg.norm(pts[2] - pts[4])
    h1  = np.linalg.norm(pts[0] - pts[3])
    return (v1 + v2) / (2.0 * h1) if h1 > 0 else 0

def get_mar(lm, w, h):
    top_lip      = np.array([lm[13].x * w,  lm[13].y * h])
    bottom_lip   = np.array([lm[14].x * w,  lm[14].y * h])
    left_corner  = np.array([lm[78].x * w,  lm[78].y * h])
    right_corner = np.array([lm[308].x * w, lm[308].y * h])
    vertical     = np.linalg.norm(top_lip - bottom_lip)
    horizontal   = np.linalg.norm(left_corner - right_corner)
    return vertical / horizontal if horizontal > 0 else 0

def get_head_pose(lm, w, h):
    img_pts = np.array([(int(lm[i].x*w), int(lm[i].y*h)) for i in POSE_IDS], dtype=np.float64)
    cam     = np.array([[w,0,w/2],[0,w,h/2],[0,0,1]], dtype=np.float64)
    ok, rvec, _ = cv2.solvePnP(MODEL_POINTS, img_pts, cam, np.zeros((4,1)), flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return 0, 0
    rmat, _    = cv2.Rodrigues(rvec)
    angles, *_ = cv2.RQDecomp3x3(rmat)
    yaw, pitch = angles[1], angles[0]
    if pitch > 90:    pitch -= 180
    elif pitch < -90: pitch += 180
    return yaw, pitch

def get_gaze(lm):
    left_iris_x  = sum(lm[i].x for i in [468,469,470,471,472]) / 5
    left_w       = max(abs(lm[133].x - lm[33].x), 0.001)
    left_ratio   = (left_iris_x - lm[33].x) / left_w
    right_iris_x = sum(lm[i].x for i in [473,474,475,476,477]) / 5
    right_w      = max(abs(lm[362].x - lm[263].x), 0.001)
    right_ratio  = (right_iris_x - lm[263].x) / right_w
    avg = (left_ratio + right_ratio) / 2
    return avg, abs(avg - 0.5) > Config.GAZE_THRESHOLD

def get_score(yaw, pitch, gaze_off, ear, is_yawning, phone_detected, side_detected):
    s = 100
    if abs(yaw)  > Config.YAW_THRESHOLD:   s -= Config.HEAD_YAW_PENALTY
    if pitch      < Config.PITCH_THRESHOLD: s -= Config.HEAD_PITCH_PENALTY
    if gaze_off:                            s -= Config.GAZE_PENALTY
    if ear        < Config.EAR_THRESHOLD:   s -= Config.EAR_PENALTY
    if is_yawning:                          s -= Config.DISTRACTION_PENALTIES.get("YAWN", 20)
    if phone_detected:                      s -= Config.DISTRACTION_PENALTIES.get("PHONE", 30)
    if side_detected:                       s -= Config.DISTRACTION_PENALTIES.get("SIDE_CONVO", 20)
    return max(0, min(100, s))

def get_state(score, ear, is_yawning, phone_detected):
    if ear < Config.EAR_THRESHOLD: return "Sleeping",   (0, 0, 255)
    elif is_yawning:               return "Yawning",    (0, 100, 255)
    elif phone_detected:           return "Phone!",     (0, 0, 200)
    elif score >= 75:              return "Attentive",  (0, 255, 0)
    elif score >= 50:              return "Moderate",   (0, 255, 255)
    else:                          return "Distracted", (0, 165, 255)

# ── DistractionScorer (optional) ──────────────────────────────────
try:
    from distraction.scorer import DistractionScorer
    scorer     = DistractionScorer()
    USE_SCORER = True
    print("[engine_webcam] DistractionScorer loaded.")
except ImportError:
    scorer     = None
    USE_SCORER = False
    print("[engine_webcam] DistractionScorer not found — phone/side-convo disabled.")

# ── Core Engine Loop ───────────────────────────────────────────────
def run_engine():
    # ── FIX 1: Load YOLO with smaller model ──────────────────────
    yolo = YOLO("yolov8n.pt")

    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=10,
        refine_landmarks=True,
        min_detection_confidence=0.2,
        min_tracking_confidence=0.2
    )

    # ── FIX 2: Lower resolution — 640x480 instead of 1280x720 ────
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 15)          # cap at 15fps — reduces CPU load

    if not cap.isOpened():
        print("[engine_webcam] ERROR: Cannot open webcam.")
        return

    # ── FIX 3: Use WINDOW_AUTOSIZE to avoid GUI blocking ─────────
    cv2.namedWindow("EduPulse - Webcam Attention", cv2.WINDOW_AUTOSIZE)

    history             = {}
    frame_count         = 0
    distraction_result  = None
    last_boxes          = []          # cache last YOLO result
    last_display_frame  = None        # cache last fully-drawn frame
    _stop_flag.clear()

    print("[engine_webcam] Webcam started. Press Q to quit.")

    while not _stop_flag.is_set():
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        # ── FIX 4: Resize to fixed working size ───────────────────
        frame = cv2.resize(frame, (640, 480))
        h_full, w_full = frame.shape[:2]
        frame_count += 1

        # ── Skip frames — show last drawn frame so overlays don't flash
        if frame_count % 2 != 0:
            display = last_display_frame if last_display_frame is not None else frame
            cv2.imshow("EduPulse - Webcam Attention", display)
            if cv2.waitKey(1) & 0xFF in (ord('q'), 27):
                break
            continue

        # ── DistractionScorer every 6 frames (was every 3) ────────
        if USE_SCORER and frame_count % 6 == 0:
            try:
                rgb_full           = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                distraction_result = scorer.score(rgb_full)
            except Exception:
                pass

        phone_detected = distraction_result.metrics.phone_detected      if distraction_result and USE_SCORER else False
        side_detected  = distraction_result.metrics.side_convo_detected if distraction_result and USE_SCORER else False

        # ── FIX 6: YOLO only every 6 frames, reuse cached boxes ───
        if frame_count % 6 == 0:
            yolo_results = yolo(frame, classes=[0], verbose=False, conf=0.15, iou=0.35)
            last_boxes   = yolo_results[0].boxes
        boxes = last_boxes

        class_scores     = []
        attentive_count  = 0
        distracted_count = 0
        headdown_count   = 0
        sleeping_count   = 0
        yawning_count    = 0

        for box_idx, box in enumerate(boxes):
            if float(box.conf[0]) < 0.15:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            box_h = y2 - y1
            box_w = x2 - x1

            if box_h < 40 or box_w < 30:
                continue

            # Head crop
            head_y1 = max(0,      y1 - int(box_h * 0.25))
            head_y2 = min(h_full, y1 + int(box_h * 0.65))
            head_x1 = max(0,      x1 - int(box_w * 0.10))
            head_x2 = min(w_full, x2 + int(box_w * 0.10))

            crop = frame[head_y1:head_y2, head_x1:head_x2]
            if crop.size == 0 or crop.shape[0] < 20 or crop.shape[1] < 20:
                continue

            # ── FIX 7: 2x upscale instead of 3x — saves a lot ────
            crop_big = cv2.resize(crop, (crop.shape[1]*2, crop.shape[0]*2))
            ch, cw   = crop_big.shape[:2]

            rgb_crop = cv2.cvtColor(crop_big, cv2.COLOR_BGR2RGB)
            results  = face_mesh.process(rgb_crop)

            # Defaults
            score       = 35
            state       = "Head Down"
            color       = (0, 100, 255)
            ear_val     = 0.3
            is_yawning  = False
            is_sleeping = False

            if results.multi_face_landmarks:
                lm = results.multi_face_landmarks[0].landmark

                yaw, pitch  = get_head_pose(lm, cw, ch)
                left_ear    = get_ear_6pt(lm, LEFT_EYE,  cw, ch)
                right_ear   = get_ear_6pt(lm, RIGHT_EYE, cw, ch)
                ear_val     = (left_ear + right_ear) / 2
                mar_val     = get_mar(lm, cw, ch)
                _, gaze_off = get_gaze(lm)

                is_sleeping = ear_val < Config.EAR_THRESHOLD
                is_yawning  = mar_val > MAR_THRESHOLD

                raw_score = get_score(yaw, pitch, gaze_off, ear_val,
                                      is_yawning, phone_detected, side_detected)

                if box_idx not in history:
                    history[box_idx] = raw_score
                score = int(history[box_idx] * (1 - EMA_FACTOR) + raw_score * EMA_FACTOR)
                history[box_idx] = score

                state, color = get_state(score, ear_val, is_yawning, phone_detected)

                debug = (f"Y:{yaw:.0f} P:{pitch:.0f} EAR:{ear_val:.2f} "
                         f"MAR:{mar_val:.2f} G:{'X' if gaze_off else 'OK'}")
                cv2.putText(frame, debug, (x1, y2+16),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180,180,180), 1)

            else:
                if box_idx not in history:
                    history[box_idx] = 35
                score = int(history[box_idx] * (1-EMA_FACTOR) + 35 * EMA_FACTOR)
                history[box_idx] = score

            class_scores.append(score)

            if is_sleeping:            sleeping_count  += 1
            elif is_yawning:           yawning_count   += 1
            elif score >= 75:          attentive_count  += 1
            elif state == "Head Down": headdown_count   += 1
            else:                      distracted_count += 1

            # Draw box
            cv2.rectangle(frame, (x1,y1), (x2,y2), color, 2)
            label = f"{state} {score}%"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            cv2.rectangle(frame, (x1, y1-26), (x1+lw+8, y1), color, -1)
            cv2.putText(frame, label, (x1+3, y1-7),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,0,0), 2)

        # ── Info Panels ───────────────────────────────────────────
        if class_scores:
            cls       = round(sum(class_scores) / len(class_scores))
            cls_color = (0,255,0) if cls>=75 else (0,255,255) if cls>=50 else (0,0,255)
            cls_state = "Good"    if cls>=75 else "Moderate"  if cls>=50 else "Low"

            cv2.rectangle(frame, (0,0), (280,155), (0,0,0), -1)
            cv2.rectangle(frame, (0,0), (280,155), cls_color, 2)
            cv2.putText(frame, f"Class: {cls}% {cls_state}",
                        (10,28),  cv2.FONT_HERSHEY_SIMPLEX, 0.7, cls_color, 2)
            cv2.putText(frame, f"Students:   {len(class_scores)}",
                        (10,52),  cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255,255,255), 1)
            cv2.putText(frame, f"Attentive:  {attentive_count}",
                        (10,72),  cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0,255,0), 1)
            cv2.putText(frame, f"Distracted: {distracted_count}",
                        (10,92),  cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0,165,255), 1)
            cv2.putText(frame, f"Head Down:  {headdown_count}",
                        (10,112), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0,100,255), 1)
            cv2.putText(frame, f"Sleeping:   {sleeping_count}",
                        (10,132), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0,0,255), 1)

            true_distraction = 100 - cls
            d_color = (0,0,255) if true_distraction > 50 else (0,255,0)
            cv2.rectangle(frame, (0, h_full-70), (320, h_full), (0,0,0), -1)
            cv2.rectangle(frame, (0, h_full-70), (320, h_full), d_color, 2)
            cv2.putText(frame, f"Distraction: {true_distraction}%",
                        (8, h_full-50), cv2.FONT_HERSHEY_SIMPLEX, 0.55, d_color, 2)
            cv2.putText(frame, f"Yawning:{yawning_count}  Sleeping:{sleeping_count}",
                        (8, h_full-30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255,255,255), 1)
            cv2.putText(frame, f"Phone:{phone_detected}  Side:{side_detected}",
                        (8, h_full-10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255,255,255), 1)

            # ── Push to queue ─────────────────────────────────────
            try:
                metrics_queue.put_nowait({
                    "class_score":     cls,
                    "class_state":     cls_state,
                    "students":        len(class_scores),
                    "attentive":       attentive_count,
                    "distracted":      distracted_count,
                    "head_down":       headdown_count,
                    "sleeping":        sleeping_count,
                    "yawning":         yawning_count,
                    "phone_detected":  phone_detected,
                    "side_convo":      side_detected,
                    "distraction_pct": true_distraction,
                    "timestamp":       time.time(),
                })
            except queue.Full:
                pass

            if frame_count % 6 == 0:
                print(f"[webcam] Score:{cls}% | "
                      f"Sleep:{sleeping_count>0} | Yawn:{yawning_count>0} | "
                      f"Phone:{phone_detected} | Side:{side_detected}")

        else:
            cv2.rectangle(frame, (0,0), (220,38), (0,0,0), -1)
            cv2.putText(frame, "No students detected",
                        (8,26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)

        last_display_frame = frame.copy()   # cache fully drawn frame
        cv2.imshow("EduPulse - Webcam Attention", frame)

        # ── FIX 8: waitKey(1) not (30) — keeps window responsive ─
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    for _ in range(4):
        cv2.waitKey(1)
    face_mesh.close()
    print("[engine_webcam] Stopped.")


# ── FastAPI Interface ──────────────────────────────────────────────
def start():
    global _thread
    _stop_flag.clear()
    _thread = threading.Thread(target=run_engine, daemon=True)
    _thread.start()
    print("[engine_webcam] Thread started.")

def stop():
    _stop_flag.set()
    print("[engine_webcam] Stop signal sent.")

def is_running():
    return _thread is not None and _thread.is_alive()