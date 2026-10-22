import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from app.sockets.pose_socket import register_socket_handlers

app = Flask(__name__, static_folder="dist", static_url_path="")
app.config["SECRET_KEY"] = "smartfit-super-secret-key"
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
register_socket_handlers(socketio)

@app.route("/")
def index():
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")
    return "SmartFit Python MediaPipe Server is running."

@app.route("/api/health")
def health():
    return {"status": "ok", "service": "SmartFit Vision Core"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 SmartFit Python MediaPipe Core running on port {port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
