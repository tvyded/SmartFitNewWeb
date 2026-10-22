import cv2
import mediapipe as mp
import numpy as np
import base64

class PoseDetector:
    def __init__(self, min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            model_complexity=1,
            smooth_landmarks=True
        )

    def find_pose_from_base64(self, b64_frame):
        try:
            if "," in b64_frame:
                b64_frame = b64_frame.split(",", 1)[1]
            data = base64.b64decode(b64_frame)
            np_arr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                return None, None

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = self.pose.process(img_rgb)

            landmarks = []
            if results.pose_landmarks:
                for lm in results.pose_landmarks.landmark:
                    landmarks.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility
                    })
                return results.pose_landmarks.landmark, landmarks
            return None, None
        except Exception as e:
            print("Error processing frame:", e)
            return None, None
