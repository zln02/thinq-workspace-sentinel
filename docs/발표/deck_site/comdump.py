#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""COM 포트 진단 — 어떤 포트가 있고, 보드가 실제로 뭘 보내는지(raw) 확인."""
import time
try:
    import serial
    from serial.tools import list_ports
except ImportError:
    print("pip install pyserial 먼저"); raise SystemExit

print("=== 연결된 COM 포트 ===")
ports = list(list_ports.comports())
for p in ports:
    print(f"  {p.device}  |  {p.description}  |  {p.manufacturer}")
if not ports:
    print("  (없음 — 아두이노 USB 연결/드라이버 확인)"); raise SystemExit

port = ports[0].device
# Arduino류 우선
for p in ports:
    if any(k in ((p.description or "")+(p.manufacturer or "")) for k in ("Arduino","CH340","USB-SERIAL","USB Serial","wch","Genuino")):
        port = p.device; break
print(f"\n=== {port} raw 읽기 (115200 → 9600) ===")
for baud in (115200, 9600):
    print(f"--- baud {baud} ---")
    try:
        s = serial.Serial(port, baud, timeout=1); time.sleep(2.5)
        n = 0
        t = time.time()
        while time.time()-t < 6 and n < 8:
            ln = s.readline()
            if ln:
                print("  RAW>", repr(ln)); n += 1
        s.close()
        if n == 0:
            print("  (무응답 — 보드 침묵/리셋중)")
    except Exception as e:
        print(f"  ERR: {e}")  # PermissionError = IDE 시리얼모니터가 포트 점유중
print("\n=== 끝. 위 RAW 줄을 복사해서 알려주세요 ===")
