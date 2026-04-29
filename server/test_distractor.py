import cv2
import time
from core.config import Config
from distraction.scorer import DistractionScorer
from video.stream_handler import StreamHandler
from video.frame_extractor import FrameExtractor

stream = StreamHandler()
extractor = FrameExtractor()
scorer = DistractionScorer()

stream.start()
print("Distraction detector started. Press Ctrl+C to stop.\n")

try:
  while True:
    raw_frame = stream.read_frame()
    if raw_frame is None:
      continue

    rgb_frame = extractor.extract(raw_frame)
    if rgb_frame is None:
      continue

    result = scorer.score(rgb_frame)

    print(
      f"Score: {result.distraction_score:5.1f} | "
      f"Sleep: {result.metrics.sleep_detected} | "
      f"Yawn: {result.metrics.yawn_detected} | "
      f"SideConvo: {result.metrics.side_convo_detected} | "
      f"Phone: {result.metrics.phone_detected}"
    )

    # Optional: Display the frame to see it working
    cv2.imshow("Distraction Test", raw_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
      break

    time.sleep(0.1)

except KeyboardInterrupt:
  print("\nStopping...")

finally:
  stream.stop()
  cv2.destroyAllWindows()