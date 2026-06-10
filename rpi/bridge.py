#!/usr/bin/env python3
"""라즈베리파이 센서 브릿지.

아두이노(/dev/ttyACM0)의 시리얼 출력을 읽어 GCP 백엔드로 POST.
아두이노 출력 형식: "온도:23.80C 습도:48.00% CO2:650 재실:1"
  (CO2·재실은 옵셔널 — 둘 다 없는 "온도:..% " 도 동작)
  CO2 -1 = 센서 워밍업/오류(무시), 재실 1=사람 있음 / 0=빈 병실
  ※ MQ2 가스센서는 제거(CO2 실측이 폴백을 대체).

백엔드 응답 tier 는 시리얼로 아두이노에 회신("TIER:XXX\\n") → LED 게이지 점등.

사용: python3 bridge.py
환경변수:
  SENTINEL_API : 백엔드 ingest URL (기본 GCP Tailscale IP)
  SERIAL_PORT  : 기본 /dev/ttyACM0
  BAUD         : 기본 9600
  SPACE_ID     : 기본 ward_a
"""
import glob
import os
import re
import time

import requests
import serial


def _find_port() -> str:
    """SERIAL_PORT 지정 시 그대로, 없으면 존재하는 ttyACM*/ttyUSB* 자동 선택.

    아두이노 재업로드/USB 재연결 시 ACM0↔ACM1 번호가 바뀌어도 견고하게 동작.
    """
    env = os.getenv("SERIAL_PORT")
    if env:
        return env
    for pat in ("/dev/ttyACM*", "/dev/ttyUSB*"):
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[0]
    return "/dev/ttyACM0"


PORT = _find_port()
BAUD = int(os.getenv("BAUD", "9600"))
API = os.getenv("SENTINEL_API", "http://100.96.227.23:8003/api/v1/sensor/reading")
SPACE = os.getenv("SPACE_ID", "ward_a")
API_KEY = os.getenv("SENTINEL_API_KEY", "")  # 백엔드 인증키(설정 시 헤더 전송)

PAT = re.compile(
    r"온도:([\d.]+)C 습도:([\d.]+)%"
    r"(?: CO2:(-?\d+))?(?: 재실:([01]))?"  # CO2·재실 옵셔널
)


def _read_loop(ser):
    """단일 시리얼 세션의 read→POST 루프. 시리얼 단절 시 예외를 올려 재연결."""
    while True:
        line = ser.readline().decode("utf-8", "ignore").strip()
        m = PAT.search(line)
        if not m:
            continue
        temp, hum, co2, presence = m.groups()
        payload = {
            "space_id": SPACE,
            "device_id": "rpi-arduino",
            "temp_c": float(temp),
            "humidity": float(hum),
        }
        # CO2: 유효(>=0)할 때만 전송. 없거나 -1(워밍업/오류)이면 생략→백엔드 코웨이 폴백 유지
        if co2 is not None and int(co2) >= 0:
            payload["co2_ppm"] = float(co2)
        # 재실: 0(빈 병실)이면 occupancy=0→PoI 0. 1(재실)/미측정이면 생략→백엔드 DEMO_OCCUPANCY 폴백
        if presence == "0":
            payload["occupancy"] = 0
        try:
            hdr = {"X-API-Key": API_KEY} if API_KEY else {}
            r = requests.post(API, json=payload, headers=hdr, timeout=4)
            j = r.json()
            tier = j.get("tier")
            if tier:  # 아두이노 LED 게이지 회신
                ser.write(f"TIER:{tier}\n".encode())
            print(f"  {temp}C {hum}% co2={co2} 재실={presence} → tier={tier} coway={j.get('coway')}")
        except Exception as e:  # noqa: BLE001
            print(f"  POST 실패: {e}")


def main():
    """시리얼 단절(USB 뽑힘/리셋) 시 자체 재연결. systemd 재시작에 의존하지 않음."""
    while True:
        ser = None
        try:
            port = _find_port()  # 재연결마다 포트 재탐색(ttyACM0↔ACM1 유동)
            ser = serial.Serial(port, BAUD, timeout=2)
            time.sleep(2.5)  # 아두이노 리셋 부팅 대기
            ser.reset_input_buffer()
            print(f"[bridge] {port}@{BAUD} → {API}")
            _read_loop(ser)
        except (OSError, serial.SerialException) as e:
            print(f"[bridge] 시리얼 단절: {e} — 3초 후 재연결")
            time.sleep(3)
        except KeyboardInterrupt:
            print("[bridge] 종료")
            break
        finally:
            if ser is not None and ser.is_open:
                try:
                    ser.close()
                except Exception:  # noqa: BLE001
                    pass


if __name__ == "__main__":
    main()
