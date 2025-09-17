from flask import Flask, Response
import cv2
import threading
from flask_cors import CORS  # Import the CORS module

app = Flask(__name__)
# Enable CORS for all routes, or specify origins
CORS(app, origins=["http://localhost:3001"])

class Camera:
    def __init__(self):
        self.camera = cv2.VideoCapture(0)
        if not self.camera.isOpened():
            raise Exception("Could not open camera")
        self.frame = None
        self.running = True
        self.thread = threading.Thread(target=self.update_frame)
        self.thread.daemon = True
        self.thread.start()
        print("Mac camera initialized successfully")

    def update_frame(self):
        while self.running:
            ret, frame = self.camera.read()
            if ret:
                self.frame = frame

    def get_frame(self):
        if self.frame is not None:
            ret, jpeg = cv2.imencode('.jpg', self.frame)
            if ret:
                return jpeg.tobytes()
        return None

    def release(self):
        self.running = False
        self.thread.join()
        self.camera.release()

camera = Camera()

def generate_frames():
    while True:
        frame = camera.get_frame()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return "Mac Camera Stream Server - Use /video_feed for stream or /snapshot for images"

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/snapshot')
def snapshot():
    frame = camera.get_frame()
    if frame:
        return Response(frame, mimetype='image/jpeg')
    return "No frame available", 500

if __name__ == '__main__':
    print("=== Mac Camera Stream Server ===")
    print("Running on port 5002")
    print("Stream endpoint: http://localhost:5002/video_feed")
    print("Snapshot endpoint: http://localhost:5002/snapshot")
    print("\nTo expose to VM, run this SSH tunnel:")
    print("ssh -R 9999:localhost:5002 aicha19@4.234.141.39")
    print("\nThen VM can access: http://localhost:9999/snapshot")
    
    try:
        app.run(host='0.0.0.0', port=5002, debug=False)
    finally:
        camera.release()