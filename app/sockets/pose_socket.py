from flask import request
from flask_socketio import emit
from app.vision.detector import PoseDetector
from app.vision.factory import ExerciseFactory

# Session state per connection
client_sessions = {}
detector = PoseDetector()

def register_socket_handlers(socketio):
    @socketio.on("connect")
    def handle_connect():
        sid = request.sid
        client_sessions[sid] = {
            "exercise": ExerciseFactory.create("squat"),
            "current_key": "squat"
        }
        emit("connected", {"status": "ok", "sid": sid})

    @socketio.on("disconnect")
    def handle_disconnect():
        sid = request.sid
        if sid in client_sessions:
            del client_sessions[sid]

    @socketio.on("select_exercise")
    def handle_select_exercise(data):
        sid = request.sid
        key = data.get("exercise", "squat")
        try:
            ex_instance = ExerciseFactory.create(key)
            client_sessions[sid] = {
                "exercise": ex_instance,
                "current_key": key
            }
            emit("exercise_selected", {"status": "ok", "exercise": key})
        except Exception as e:
            emit("error", {"message": str(e)})

    @socketio.on("reset_exercise")
    def handle_reset():
        sid = request.sid
        if sid in client_sessions and client_sessions[sid].get("exercise"):
            client_sessions[sid]["exercise"].reset()
            state = client_sessions[sid]["exercise"].get_state()
            emit("pose_feedback", state)

    @socketio.on("process_frame")
    def handle_frame(data):
        sid = request.sid
        frame_b64 = data.get("frame")
        if not frame_b64:
            return

        session = client_sessions.get(sid)
        if not session or not session.get("exercise"):
            session = {
                "exercise": ExerciseFactory.create("squat"),
                "current_key": "squat"
            }
            client_sessions[sid] = session

        raw_landmarks, landmarks_list = detector.find_pose_from_base64(frame_b64)
        if raw_landmarks:
            state = session["exercise"].process(raw_landmarks)
            state["landmarks"] = landmarks_list
            emit("pose_feedback", state)
        else:
            emit("pose_feedback", {
                "landmarks": [],
                "reps": session["exercise"].reps,
                "status_text": "Человек не обнаружен в кадре",
                "status_color": "#888888",
                "error_flag": False
            })

    @socketio.on("finish_set")
    def handle_finish_set():
        sid = request.sid
        session = client_sessions.get(sid)
        if session and session.get("exercise"):
            reps = session["exercise"].reps
            session["exercise"].reset()
            emit("set_finished", {"reps": reps, "exercise": session["current_key"]})
