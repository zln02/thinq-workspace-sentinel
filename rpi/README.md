# 라즈베리파이 시연 게이트웨이

아두이노 센서를 읽어 GCP 백엔드로 전송하고(브릿지), 실시간 대시보드를 풀스크린으로 표출(키오스크)하는 현장 단말.

```
[아두이노] --시리얼--> [라파이 bridge.py] --HTTP--> [GCP :8003] --> tier 계산 --> [코웨이 제어]
                              └ chromium --kiosk --> Next 대시보드(:3001/sentinel) 풀스크린
```

## 구성요소
| 파일 | 역할 |
|---|---|
| `bridge.py` | `/dev/ttyACM0` 시리얼 파싱 → `POST /api/v1/sensor/reading` (가스 이동평균 평활) |
| `labwc-autostart` | **(권장)** Bookworm/Wayland 세션 자동시작 — 브릿지+키오스크 일괄, 시리얼 중복 방지 |
| `sentinel-bridge.service` | 브릿지 systemd 상주 서비스 (대안, `Restart=always`) |
| `kiosk.sh` | 크로미움 풀스크린 키오스크 스크립트 (수동 테스트용) |
| `install.sh` | 원샷 설치 (의존성 + autostart 등록) |

## ⚠️ 컴포지터 주의 (실측 검증)
Raspberry Pi OS **Bookworm 기본 컴포지터는 labwc(Wayland)**다.
- **SSH 로 `chromium` 을 띄우면 세션 밖이라 창이 안 뜬다**(프로세스는 잠깐 살았다 죽음). 키오스크는 반드시 **세션 내부 autostart**(`~/.config/labwc/autostart`)로 올려야 한다.
- 브릿지가 **2개 이상 뜨면 `/dev/ttyACM0` 시리얼을 동시 점유해 읽기가 깨진다**(데이터 안 흐름). autostart 가 python 브릿지를 정리 후 1개만 띄운다.
- `pkill -f bridge.py` 는 **SSH `--cmd` 문자열까지 매칭해 자기 세션을 죽일 수 있다**. python 프로세스만 골라 종료할 것: `for p in $(pgrep -f bridge.py); do [ "$(cat /proc/$p/comm)" = python3 ] && kill -9 $p; done`

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
키오스크 URL은 `SENTINEL_DASHBOARD` 환경변수로 override (기본 `http://100.96.227.23:3001/sentinel`). 레거시 단독 HTML(`:8003/dashboard`)은 Next FM 뷰로 흡수·제거됨.

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

### 발표장(D-Day) 네트워크 폴백 — 중요
- **Tailscale 의존 차단**: 발표장 망에서 라파이→GCP 통신이 막히면, `bridge.env` 의 `SENTINEL_API` 를 **발표장에서 접근 가능한 주소**(예: 노트북 핫스팟 IP의 백엔드)로 오버라이드한다. 기본값은 Tailscale IP(`100.96.227.23`)라 VPN 미연결 시 먹통.
- **최종 보험 = 대시보드 "▶ 시연 75초" 버튼**: 실센서/네트워크가 전부 죽어도, 대시보드 우상단 버튼이 **백엔드·네트워크 무관하게 클라이언트에서 tier 전이(MONITOR→…→CRITICAL→복귀) 전 과정을 75초로 재생**한다. 실연동 실패 시 즉시 이 버튼으로 전환.
- CORS: Next.js 프론트(`/sentinel`)를 별도 도메인에서 열면 백엔드 `CORS_ORIGINS=https://발표도메인` 환경변수로 허용.

## 한계/주의
- 시리얼 권한: 설치 후 `dialout` 그룹 반영 위해 재로그인 필요할 수 있음.
- 라파이3 메모리(1GB) — 그래프 포인트 수 제한(대시보드 MAXPTS) 유지 권장.
- 키오스크 절전 차단은 X11(LXDE) 기준. Wayland(Wayfire)면 `wlr-randr`/`swayidle` 별도 설정.
