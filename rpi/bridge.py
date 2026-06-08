#!/usr/bin/env python3
"""라즈베리파이 센서 브릿지.

아두이노(/dev/ttyACM0)의 시리얼 출력을 읽어 GCP 백엔드로 POST.
아두이노 출력 형식: "온도:23.80C 습도:48.00% 단계:1 가스:91"

사용: python3 bridge.py
환경변수:
  SENTINEL_API : 백엔드 ingest URL (기본 GCP Tailscale IP)
  SERIAL_PORT  : 기본 /dev/ttyACM0
  BAUD         : 기본 9600
  SPACE_ID     : 기본 ward_a
"""
import os
import re
import time

import requests
import serial
from collections import deque

_gas_window: deque = deque(maxlen=5)  # 가스값 이동평균(출렁임 완화 → tier 깜빡임 방지)

PORT = os.getenv("SERIAL_PORT", "/dev/ttyACM0")
BAUD = int(os.getenv("BAUD", "9600"))
API = os.getenv("SENTINEL_API", "http://100.96.227.23:8003/api/v1/sensor/reading")
SPACE = os.getenv("SPACE_ID", "ward_a")
API_KEY = os.getenv("SENTINEL_API_KEY", "")  # 백엔드 인증키(설정 시 헤더 전송)

PAT = re.compile(r"온도:([\d.]+)C 습도:([\d.]+)% 단계:(\d+) 가스:(\d+)")


def main():
    ser = serial.Serial(PORT, BAUD, timeout=2)
    time.sleep(2.5)  # 아두이노 리셋 부팅 대기
    ser.reset_input_buffer()
    print(f"[bridge] {PORT}@{BAUD} → {API}")
    while True:
        try:
            line = ser.readline().decode("utf-8", "ignore").strip()
        except Exception:
            continue
        m = PAT.search(line)
        if not m:
            continue
        temp, hum, _lvl, gas = m.groups()
        _gas_window.append(float(gas))
        gas_smooth = sum(_gas_window) / len(_gas_window)
        payload = {
            "space_id": SPACE,
            "device_id": "rpi-arduino",
            "temp_c": float(temp),
            "humidity": float(hum),
            "gas_raw": round(gas_smooth, 1),
        }
        try:
            hdr = {"X-API-Key": API_KEY} if API_KEY else {}
            r = requests.post(API, json=payload, headers=hdr, timeout=4)
            j = r.json()
            print(f"  {temp}C {hum}% gas={gas} → tier={j.get('tier')} coway={j.get('coway')}")
        except Exception as e:  # noqa: BLE001
            print(f"  POST 실패: {e}")


if __name__ == "__main__":
    main()
