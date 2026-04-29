# video/frame_extractor.py

import cv2
from core.config import Config

class FrameExtractor:
    def extract(self, frame):
        if frame is None:
            return None

        # Resize
        frame = cv2.resize(frame, (Config.FRAME_WIDTH, Config.FRAME_HEIGHT))

        # BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        return rgb_frame