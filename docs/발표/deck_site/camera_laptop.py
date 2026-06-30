#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""노트북 카메라 — YOLO 사람 검출 + 박스 그린 MJPEG 송출 + 인원수 POST.
실행: python camera_laptop.py    (필요: pip install ultralytics opencv-python requests)
  - MJPEG 영상:  http://<이 노트북 Tailscale IP>:8089/video.mjpg  (센서 화면이 임베드)
  - 인원수 POST: VM /sensor/reading (occupancy)
"""
import threading, time, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
try:
    import cv2, requests
    from ultralytics import YOLO
except ImportError:
    print("설치:  pip install ultralytics opencv-python requests"); sys.exit(1)

API = "http://100.116.57.11:8103/api/v1/sensor/reading"
SPACE = "ward_a"; PORT = 8089; CONF = 0.4
_latest = {"jpg": None, "n": 0}

def capture_loop():
    model = YOLO("yolov8n.pt")
    cap = cv2.VideoCapture(0)
    last_post = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.1); continue
        res = model(frame, classes=[0], conf=CONF, verbose=False)[0]
        n = 0
        for box in res.boxes:
            n += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (54, 211, 153), 2)
            cv2.putText(frame, f"person {float(box.conf[0]):.2f}", (x1, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (54, 211, 153), 2)
        cv2.putText(frame, f"YOLO 재실 인원: {n}", (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (91, 157, 255), 2)
        ok2, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if ok2:
            _latest["jpg"] = buf.tobytes(); _latest["n"] = n
        now = time.time()
        if now - last_post >= 1.5:   # 1.5초마다 인원수 전송
            last_post = now
            try: requests.post(API, json={"space_id": SPACE, "device_id": "cam-laptop", "occupancy": n}, timeout=3)
            except Exception: pass

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith("/video"):
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers()
            while True:
                jpg = _latest["jpg"]
                if jpg:
                    try:
                        self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n")
                    except Exception: break
                time.sleep(0.08)
        else:
            self.send_response(200); self.send_header("Content-Type", "text/plain"); self.end_headers()
            self.wfile.write(f"camera up, n={_latest['n']}".encode())

if __name__ == "__main__":
    threading.Thread(target=capture_loop, daemon=True).start()
    print(f"[camera] MJPEG http://0.0.0.0:{PORT}/video.mjpg  +  POST {API}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
