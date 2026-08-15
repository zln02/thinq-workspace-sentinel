# sentinel-backend (:8103) 종료 시점 로그

- 프로세스: PID 2708569, `.venv/bin/python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8103`
- 기동: 2026-07-22 12:29:07 (수동 기동, systemd 유닛 아님)
- 종료: 2026-08-15 11:08:24 UTC
- 종료 사유: 프로젝트 아카이브에 따른 유휴 서비스 정리
- 원본: 표준출력 로그 마지막 200줄 (전체 78줄)

```
INFO:     Started server process [2708569]
INFO:     Waiting for application startup.
[보안] SENTINEL_API_KEY 미설정 + 데모 모드(SENTINEL_DEMO) — POST API 무인증 통과. 운영 배포 전 키 설정 필수.
[보안] ADMIN_CONTROL_PW 미설정 + 데모 모드 — 제어모드 비번 데모 기본값('admin'). 운영 배포 전 설정 필수.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8103 (Press CTRL+C to quit)
INFO:     127.0.0.1:52066 - "GET /health HTTP/1.1" 200 OK
INFO:     127.0.0.1:52068 - "GET /api/v1/sites HTTP/1.1" 200 OK
INFO:     127.0.0.1:52080 - "GET /api/v1/pathogens HTTP/1.1" 200 OK
INFO:     127.0.0.1:52094 - "GET /api/v1/devices HTTP/1.1" 200 OK
INFO:     127.0.0.1:52102 - "GET /api/v1/legal HTTP/1.1" 200 OK
INFO:     127.0.0.1:52110 - "GET /api/v1/simulate/scenarios HTTP/1.1" 200 OK
SENTINEL_API_KEY 미설정 — 데모 모드(SENTINEL_DEMO)로 제어 API 무인증 통과. 운영에선 키 설정 필수.
INFO:     127.0.0.1:51898 - "POST /api/v1/simulate HTTP/1.1" 200 OK
INFO:     127.0.0.1:51902 - "GET /api/v1/external/signals?limit=3 HTTP/1.1" 200 OK
INFO:     127.0.0.1:50026 - "POST /api/v1/simulate HTTP/1.1" 200 OK
INFO:     127.0.0.1:36734 - "GET /health HTTP/1.1" 200 OK
INFO:     15.222.185.40:59268 - "GET / HTTP/1.0" 404 Not Found
WARNING:  Invalid HTTP request received.
INFO:     47.84.140.143:35854 - "GET / HTTP/1.1" 404 Not Found
INFO:     111.7.96.176:12044 - "GET / HTTP/1.1" 404 Not Found
WARNING:  Invalid HTTP request received.
INFO:     139.162.49.49:52828 - "GET /cgi-bin/magicBox.cgi?action=getSystemInfo HTTP/1.1" 404 Not Found
INFO:     139.162.49.49:52832 - "GET /cgi-bin/configManager.cgi?action=getConfig&name=General HTTP/1.1" 404 Not Found
INFO:     139.162.49.49:52848 - "GET /RPC2_Login HTTP/1.1" 404 Not Found
INFO:     162.216.150.246:65072 - "GET / HTTP/1.1" 404 Not Found
INFO:     87.236.176.233:50861 - "GET / HTTP/1.1" 404 Not Found
INFO:     147.185.133.148:60918 - "GET / HTTP/1.1" 404 Not Found
INFO:     34.209.138.184:36978 - "GET / HTTP/1.0" 404 Not Found
INFO:     194.187.176.202:18172 - "GET / HTTP/1.1" 404 Not Found
INFO:     194.187.176.103:18176 - "GET /favicon.ico HTTP/1.1" 404 Not Found
WARNING:  Invalid HTTP request received.
INFO:     8.216.17.135:41836 - "GET / HTTP/1.1" 404 Not Found
INFO:     87.236.176.16:35923 - "GET / HTTP/1.1" 404 Not Found
INFO:     45.92.17.75:16088 - "GET / HTTP/1.1" 404 Not Found
INFO:     195.96.139.234:55605 - "GET / HTTP/1.1" 404 Not Found
WARNING:  Invalid HTTP request received.
INFO:     47.84.143.145:33158 - "GET / HTTP/1.1" 404 Not Found
INFO:     111.7.96.152:58402 - "GET / HTTP/1.1" 404 Not Found
INFO:     185.247.137.126:48629 - "GET / HTTP/1.1" 404 Not Found
INFO:     45.79.123.76:49144 - "GET / HTTP/1.0" 404 Not Found
INFO:     45.79.123.76:49156 - "OPTIONS / HTTP/1.0" 404 Not Found
INFO:     45.79.123.76:49158 - "OPTIONS / HTTP/1.0" 404 Not Found
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
INFO:     45.79.123.76:49304 - "GET /nice%20ports%2C/Trinity.txt.bak HTTP/1.0" 404 Not Found
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
INFO:     45.79.123.76:50156 - "GET /devicedesc.xml HTTP/1.1" 404 Not Found
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
INFO:     45.79.123.76:50286 - "GET / HTTP/1.1" 404 Not Found
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
WARNING:  Invalid HTTP request received.
```
