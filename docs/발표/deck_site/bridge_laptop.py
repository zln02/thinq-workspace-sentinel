#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""노트북(Windows)용 센서 브리지 — COM 자동탐지 + baud 자동탐지(9600/115200) → Tailscale로 VM POST."""
import re, time, sys
try:
    import serial
    from serial.tools import list_ports
    import requests
except ImportError:
    print("먼저:  pip install pyserial requests"); sys.exit(1)

API = "http://100.116.57.11:8103/api/v1/sensor/reading"
SPACE = "ward_a"
PAT = re.compile(r"온도:([\d.]+)C 습도:([\d.]+)%(?: CO2:(-?\d+))?(?: 재실:([01]))?")

def find_port():
    ports = list(list_ports.comports())
    for p in ports:
        if any(k in ((p.description or "")+(p.manufacturer or "")) for k in ("Arduino","CH340","USB-SERIAL","USB Serial","wch","Genuino")):
            return p.device
    return ports[0].device if ports else None

def detect_baud(port):
    for baud in (9600, 115200, 57600):
        try:
            s = serial.Serial(port, baud, timeout=1); time.sleep(2.2)
            t = time.time(); hit = False
            while time.time()-t < 3.5:
                ln = s.readline().decode("utf-8","ignore")
                if "온도" in ln or "BOOT" in ln:
                    hit = True; break
            s.close()
            if hit:
                print(f"  baud 자동탐지: {baud}", flush=True); return baud
        except Exception:
            pass
    print("  baud 미탐지 — 9600 가정", flush=True); return 9600

print("[laptop-bridge] start ->", API, flush=True)
while True:
    port = find_port()
    if not port:
        print("  COM 포트 없음 — 2s 후 재탐색", flush=True); time.sleep(2); continue
    baud = detect_baud(port)
    try:
        ser = serial.Serial(port, baud, timeout=2); time.sleep(2.0); ser.reset_input_buffer()
        print(f"  연결됨 {port}@{baud}", flush=True)
    except Exception as e:
        print(f"  열기 실패 {port}: {e} (Arduino IDE 시리얼모니터 닫기)", flush=True); time.sleep(2); continue
    try:
        empties = 0
        while True:
            line = ser.readline().decode("utf-8","ignore").strip()
            if not line:
                empties += 1
                if empties > 5: raise IOError("no data")
                continue
            empties = 0
            m = PAT.search(line)
            if not m:
                continue
            temp, hum, co2, presence = m.groups()
            t, h = float(temp), float(hum)
            payload = {"space_id": SPACE, "device_id": "rpi-arduino"}
            if not (t == 0.0 and h == 0.0):
                payload["temp_c"] = t; payload["humidity"] = h
            if co2 is not None and int(co2) >= 0: payload["co2_ppm"] = float(co2)
            if presence == "0": payload["occupancy"] = 0
            elif presence == "1": payload["occupancy"] = 1
            try:
                r = requests.post(API, json=payload, timeout=4)
                print(f"  {line} -> tier={r.json().get('tier')} OK", flush=True)
            except Exception as e:
                print(f"  POST 실패: {e}", flush=True)
    except Exception as e:
        print(f"  끊김({e}) -> 재연결", flush=True)
        try: ser.close()
        except Exception: pass
        time.sleep(0.8)
