#!/usr/bin/env python3
"""VM용 아두이노/라파이 센서 에뮬레이터.

실제 아두이노 시리얼 출력(온도:..C 습도:..% CO2:..)을 그대로 만들어
bridge.py 와 동일한 파싱·전송 경로로 백엔드에 상시 POST 한다.
라즈베리파이/아두이노 하드웨어 없이도 대시보드에 센서 데이터가 실시간으로 흐른다.

환경변수:
  SENTINEL_API : 기본 http://127.0.0.1:8103/api/v1/sensor/reading
  SPACE_ID     : 기본 ward_a (실센서 병동)
  INTERVAL     : 전송 주기(초), 기본 4
  CO2_BASE     : CO2 기준치 ppm, 기본 750 (MONITOR~CAUTION 대역)
"""
import math
import os
import random
import re
import time

import requests

API = os.getenv("SENTINEL_API", "http://127.0.0.1:8103/api/v1/sensor/reading")
SPACE = os.getenv("SPACE_ID", "ward_a")
INTERVAL = float(os.getenv("INTERVAL", "4"))
CO2_BASE = float(os.getenv("CO2_BASE", "750"))
API_KEY = os.getenv("SENTINEL_API_KEY", "")

PAT = re.compile(r"온도:([\d.]+)C 습도:([\d.]+)%(?: CO2:(-?\d+))?")


def main():
    print(f"[emulator] {API} space={SPACE} every {INTERVAL}s co2_base={CO2_BASE}", flush=True)
    t0 = time.time()
    while True:
        t = (time.time() - t0) / 60.0  # 분 단위
        # 완만한 일주기 변동 + 소음 (사람 활동에 따른 자연스러운 흐름)
        temp = round(23.5 + 1.2 * math.sin(t / 8.0) + random.uniform(-0.2, 0.2), 2)
        hum = round(50 + 6 * math.sin(t / 11.0) + random.uniform(-1, 1), 2)
        co2 = int(max(450, CO2_BASE + 200 * math.sin(t / 6.0) + random.uniform(-40, 60)))

        # 아두이노 시리얼 라인 생성 → bridge 와 동일하게 파싱
        line = f"온도:{temp:.2f}C 습도:{hum:.2f}% CO2:{co2}"
        m = PAT.search(line)
        tt, hh, cc = m.groups()
        payload = {
            "space_id": SPACE,
            "device_id": "rpi-arduino",
            "temp_c": float(tt),
            "humidity": float(hh),
        }
        if cc is not None and int(cc) >= 0:
            payload["co2_ppm"] = float(cc)
        try:
            hdr = {"X-API-Key": API_KEY} if API_KEY else {}
            r = requests.post(API, json=payload, headers=hdr, timeout=5)
            j = r.json()
            print(f"  {line} -> tier={j.get('tier')} poi={j.get('poi')} gov={j.get('governance')}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"  POST 실패: {e}", flush=True)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
