# 라즈베리파이 시연 게이트웨이

아두이노 센서를 읽어 GCP 백엔드로 전송하고(브릿지), 실시간 대시보드를 풀스크린으로 표출(키오스크)하는 현장 단말.

```
[아두이노] --시리얼--> [라파이 bridge.py] --HTTP--> [GCP :8003] --> tier 계산 --> [코웨이 제어]
                              └ chromium --kiosk --> 대시보드(:8003/dashboard) 풀스크린
```

## 구성요소
| 파일 | 역할 |
|---|---|
| `bridge.py` | `/dev/ttyACM0` 시리얼 파싱 → `POST /api/v1/sensor/reading` (가스 이동평균 평활) |
| `sentinel-bridge.service` | 브릿지 systemd 상주 서비스 (`Restart=always` — 시연 중 끊겨도 자동 복구) |
| `kiosk.sh` | 크로미움 풀스크린 키오스크 (절전 차단 + 백엔드 헬스 대기 + 크래시 팝업 억제) |
| `install.sh` | 원샷 설치 (의존성 + 브릿지 서비스 + 키오스크 autostart) |

## 설치 (라파이에서 1회)
```bash
git clone <repo> && cd thinq-workspace-sentinel/rpi
bash install.sh
sudo reboot   # 키오스크 autostart 적용
```

## 환경설정 — `~/sentinel-bridge/bridge.env`
```
SENTINEL_API=http://100.96.227.23:8003/api/v1/sensor/reading
SERIAL_PORT=/dev/ttyACM0
BAUD=9600
SPACE_ID=ward_a          # 병동 식별자 (다병동 시연 시 단말마다 다르게)
```
키오스크 URL은 `SENTINEL_DASHBOARD` 환경변수로 override (기본 `http://100.96.227.23:8003/dashboard`).

## 운영 점검
```bash
sudo systemctl status sentinel-bridge        # 브릿지 상태
journalctl -u sentinel-bridge -f             # 실시간 로그 (tier/coway 응답)
~/sentinel-bridge/kiosk.sh                    # 키오스크 수동 실행 테스트
```

## 시연 체크리스트 (D-1)
1. `sudo tailscale up --ssh` — 원격 접속 보장 (재부팅 후 ACL 재적용)
2. 아두이노 USB 연결 → `ls /dev/ttyACM0` 확인
3. `systemctl status sentinel-bridge` → active(running)
4. 키오스크 화면에 실시간 그래프/tier 표시 확인
5. 센서 트리거(가스/온습도) → 대시보드 tier 변화 + 코웨이 가동 리허설
6. 외부신호 지역 선택(예: 부산 replay) → 선제 ALERT + 코웨이 자동 가동 확인

## 한계/주의
- 시리얼 권한: 설치 후 `dialout` 그룹 반영 위해 재로그인 필요할 수 있음.
- 라파이3 메모리(1GB) — 그래프 포인트 수 제한(대시보드 MAXPTS) 유지 권장.
- 키오스크 절전 차단은 X11(LXDE) 기준. Wayland(Wayfire)면 `wlr-randr`/`swayidle` 별도 설정.
