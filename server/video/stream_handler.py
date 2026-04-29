# video/stream_handler.py

import cv2
from core.config import Config

class StreamHandler:
    def __init__(self):
        self.cap = None
        self.running = False

    def start(self):
        self.cap = cv2.VideoCapture(Config.CAMERA_INDEX)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, Config.FRAME_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, Config.FRAME_HEIGHT)
        self.running = True

    def read_frame(self):
        if not self.cap or not self.running:
            return None
        ret, frame = self.cap.read()
        if not ret:
            return None
        return frame

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()
            self.cap = None