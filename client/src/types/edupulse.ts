/**
 * Matches the flat JSON payload streamed by the FastAPI backend (engine.py).
 *
 * Example:
 * {
 *   class_score: 82,
 *   class_state: "Good",
 *   students: 5,
 *   attentive: 3,
 *   distracted: 1,
 *   head_down: 0,
 *   sleeping: 1,
 *   yawning: 0,
 *   phone_detected: false,
 *   side_convo: false,
 *   distraction_pct: 18,
 *   timestamp: 1714400000.123
 * }
 */
export interface EduPulseFrame {
  class_score: number;
  class_state: string;
  students: number;
  attentive: number;
  distracted: number;
  head_down: number;
  sleeping: number;
  yawning: number;
  phone_detected: boolean;
  side_convo: boolean;
  distraction_pct: number;
  timestamp: number;
}

/** Possible WebSocket connection states. */
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

/** Return type of the useEduPulseStream hook. */
export interface UseEduPulseStreamReturn {
  /** The most recent frame received from the WebSocket. */
  currentFrame: EduPulseFrame | null;
  /** Rolling buffer of the last N frames (max 60) for timeline charts. */
  timelineBuffer: EduPulseFrame[];
  /** Current WebSocket connection status. */
  status: ConnectionStatus;
  /** When the current streaming session started (set on startStream). */
  sessionStartTime: Date | null;
  /** Continuously calculated average class_score across all frames. */
  runningAverageScore: number;
  /** Highest class_score recorded during this session. */
  peakScore: number;
  /** Full history of class_score values (for Firestore timeline save). */
  scoreHistory: number[];
  /** Manually open the WebSocket connection. */
  startStream: () => void;
  /** Manually close the WebSocket connection. */
  stopStream: () => void;
}
