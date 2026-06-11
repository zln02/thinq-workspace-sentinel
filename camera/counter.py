#!/usr/bin/env python3
"""ThinQ Workspace Sentinel — 노트북 카메라 재실 인원 카운터 (YOLO).

역할분리 설계:
  - 카메라(이 모듈, 노트북) = 실측 '재실 인원수' 주력 제공
  - 라파이/아두이노(rpi/bridge.py) = 온습도·CO2 등 환경센서 전용

동작:
  웹캠 프레임 → YOLO person 검출 → 인원수 N →
  POST {SENTINEL_API} {space_id, device_id:"cam-laptop", occupancy:N}
  백엔드(ingest_reading)가 N을 Wells-Riley 재실인원 n 으로 사용.

개인정보(B2G/요양병원 핵심):
  ※ 프레임은 절대 저장/전송하지 않는다. 검출된 '사람 수(정수)'만 네트워크로 나간다.
  ※ 영상은 메모리에서 추론 직후 폐기 → 개인 식별 불가(개인정보보호법 제25조 리스크 최소화).

사용:
  pip install ultralytics opencv-python requests   # YOLOv8
  python3 counter.py
환경변수:
  SENTINEL_API     : 백엔드 ingest URL (기본 GCP Tailscale IP, bridge.py 와 동일)
  SENTINEL_API_KEY : 백엔드 인증키(설정 시 X-API-Key 헤더 전송)
  SPACE_ID         : 공간 ID (기본 ward_a — 라파이 bridge 와 같은 공간이어야 병합됨)
  CAM_INDEX        : 웹캠 인덱스 (기본 0)
  CAM_INTERVAL     : 전송 주기 초 (기본 2.0)
  CAM_CONF         : person 신뢰도 임계 (기본 0.4)
  YOLO_MODEL       : 가중치 (기본 yolov8n.pt — 최초 실행 시 자동 다운로드)

너의 YOLO 코드를 붙이려면 count_people(frame)->int 만 교체하면 된다.
"""
import os
import time

import requests

API = os.getenv("SENTINEL_API", "http://100.96.227.23:8003/api/v1/sensor/reading")
API_KEY = os.getenv("SENTINEL_API_KEY", "")
SPACE = os.getenv("SPACE_ID", "ward_a")
CAM_INDEX = int(os.getenv("CAM_INDEX", "0"))
INTERVAL = float(os.getenv("CAM_INTERVAL", "2.0"))
CONF = float(os.getenv("CAM_CONF", "0.4"))
YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")

_PERSON_CLASS = 0  # COCO class id: person


def count_people(model, frame) -> int:
    """프레임에서 사람 수를 센다. (너의 YOLO 로직으로 교체 가능)

    YOLOv8: person(class 0)만 conf>=CONF 로 필터해 개수 반환.
    """
    res = model(frame, classes=[_PERSON_CLASS], conf=CONF, verbose=False)
    if not res:
        return 0
    boxes = getattr(res[0], "boxes", None)
    return 0 if boxes is None else int(len(boxes))


def _post(occupancy: int) -> None:
    payload = {"space_id": SPACE, "device_id": "cam-laptop", "occupancy": occupancy}
    hdr = {"X-API-Key": API_KEY} if API_KEY else {}
    try:
        r = requests.post(API, json=payload, headers=hdr, timeout=4)
        j = r.json()
        print(f"  인원={occupancy} → tier={j.get('tier')} poi={j.get('poi')}")
    except Exception as e:  # noqa: BLE001
        print(f"  POST 실패: {e}")


def main() -> None:
    import cv2  # 지연 import — 라이브러리 미설치 시 메시지 명확화
    from ultralytics import YOLO

    model = YOLO(YOLO_MODEL)
    cap = cv2.VideoCapture(CAM_INDEX)
    if not cap.isOpened():
        raise SystemExit(f"[camera] 웹캠 {CAM_INDEX} 열기 실패")
    print(f"[camera] cam{CAM_INDEX} → {API} (space={SPACE}, {INTERVAL}s) · 프레임 비저장")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                time.sleep(INTERVAL)
                continue
            n = count_people(model, frame)
            del frame  # 추론 끝 → 영상 즉시 폐기(개인정보 비저장)
            _post(n)
            time.sleep(INTERVAL)
    finally:
        cap.release()


if __name__ == "__main__":
    main()
