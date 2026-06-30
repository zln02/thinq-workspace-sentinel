#!/usr/bin/env python3
"""노트북 웹캠 재실 인원 카운터 (엣지).

카메라가 달린 노트북에서 실행 → YOLOv8n으로 사람 수만 세서 백엔드로 POST.
rpi/bridge.py 와 동일한 엣지 패턴. 영상/프레임은 저장·전송하지 않고 "숫자만" 보낸다(ISMS-P).

  [노트북] 웹캠 → YOLO person count → occupancy 정수만 → [VM] POST /api/v1/sensor/reading

설치(노트북에서):
  pip install ultralytics opencv-python requests

실행:
  SENTINEL_API=http://34.47.113.176:8003/api/v1/sensor/reading \
  SPACE_ID=ward_a python3 occupancy_cam.py

환경변수:
  SENTINEL_API     : 백엔드 ingest URL (기본 GCP)
  SENTINEL_API_KEY : 백엔드 인증키(설정 시 X-API-Key 헤더 전송)
  SPACE_ID         : 공간 id (기본 ward_a)
  CAM_INDEX        : 웹캠 인덱스 (기본 0)
  POST_INTERVAL    : 전송 주기 초 (기본 5) — 이 구간의 인원수 중앙값을 보냄
  CONF             : 사람 판정 신뢰도 임계 (기본 0.4)
  SHOW             : 1이면 디버그 창 표시(박스), 0이면 헤드리스(기본 0)
"""
import os
import statistics
import time

import cv2
import requests
from ultralytics import YOLO

API = os.getenv("SENTINEL_API", "http://34.47.113.176:8003/api/v1/sensor/reading")
API_KEY = os.getenv("SENTINEL_API_KEY", "")
SPACE = os.getenv("SPACE_ID", "ward_a")
CAM_INDEX = int(os.getenv("CAM_INDEX", "0"))
POST_INTERVAL = float(os.getenv("POST_INTERVAL", "5"))
CONF = float(os.getenv("CONF", "0.4"))
SHOW = os.getenv("SHOW", "0") == "1"

PERSON_CLASS = 0  # COCO: 0 = person


def count_people(model, frame) -> int:
    """프레임 1장에서 person 박스 개수만 반환. 프레임은 버린다."""
    res = model.predict(frame, classes=[PERSON_CLASS], conf=CONF, verbose=False)
    return sum(len(r.boxes) for r in res)


def post_occupancy(n: int):
    """occupancy 정수만 전송. 영상/프레임은 절대 보내지 않음."""
    payload = {"space_id": SPACE, "device_id": "laptop-cam", "occupancy": n}
    hdr = {"X-API-Key": API_KEY} if API_KEY else {}
    try:
        r = requests.post(API, json=payload, headers=hdr, timeout=4)
        j = r.json()
        print(f"  재실={n} → tier={j.get('tier')} coway={j.get('coway')}")
    except Exception as e:  # noqa: BLE001
        print(f"  POST 실패: {e}")


def main():
    print("[occupancy_cam] YOLOv8n 로딩…")
    model = YOLO("yolov8n.pt")  # 최초 1회 자동 다운로드(~6MB)
    cap = cv2.VideoCapture(CAM_INDEX)
    if not cap.isOpened():
        raise SystemExit(f"웹캠({CAM_INDEX}) 열기 실패 — CAM_INDEX 확인")
    print(f"[occupancy_cam] cam{CAM_INDEX} → {API} (space={SPACE}, {POST_INTERVAL}s 주기)")

    samples: list[int] = []
    last_post = time.monotonic()
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.1)
                continue
            n = count_people(model, frame)
            samples.append(n)
            if SHOW:
                cv2.putText(frame, f"people: {n}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.imshow("occupancy (q=quit)", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            now = time.monotonic()
            if now - last_post >= POST_INTERVAL and samples:
                # 구간 중앙값 → 순간 오탐(프레임 단위 깜빡임) 평활화
                post_occupancy(int(statistics.median(samples)))
                samples.clear()
                last_post = now
    except KeyboardInterrupt:
        print("\n[occupancy_cam] 종료")
    finally:
        cap.release()
        if SHOW:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
