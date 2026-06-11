#!/usr/bin/env bash
# 라파이 시연 자동화 원샷 설치 — 브릿지(systemd) + 키오스크(autostart).
# 사용: bash install.sh   (라즈베리파이에서, sudo 권한 필요)
set -euo pipefail

USER_NAME="${SUDO_USER:-$(whoami)}"
HOME_DIR="/home/${USER_NAME}"
APP_DIR="${HOME_DIR}/sentinel-bridge"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "[install] 대상 사용자: ${USER_NAME}, 앱 디렉토리: ${APP_DIR}"

# 1) 의존성
sudo apt-get update -qq
sudo apt-get install -y -qq python3-serial python3-requests chromium-browser unclutter curl

# 2) 브릿지 배치
mkdir -p "${APP_DIR}"
cp "${HERE}/bridge.py" "${APP_DIR}/bridge.py"
if [ ! -f "${APP_DIR}/bridge.env" ]; then
  cat > "${APP_DIR}/bridge.env" <<EOF
# 시연 환경설정 — 필요시 수정
SENTINEL_API=http://100.96.227.23:8003/api/v1/sensor/reading
SERIAL_PORT=/dev/ttyACM0
BAUD=9600
SPACE_ID=ward_a
EOF
  echo "[install] bridge.env 생성 (기본값) — 필요시 ${APP_DIR}/bridge.env 수정"
fi
# 시리얼 권한
sudo usermod -aG dialout "${USER_NAME}" || true

# 3) 브릿지 systemd 서비스
sudo cp "${HERE}/sentinel-bridge.service" /etc/systemd/system/sentinel-bridge.service
sudo systemctl daemon-reload
sudo systemctl enable --now sentinel-bridge.service
echo "[install] 브릿지 서비스 기동 — 상태: systemctl status sentinel-bridge"

# 4) 키오스크 + 브릿지 autostart
#    Raspberry Pi OS Bookworm 기본 컴포지터는 labwc(Wayland)다.
#    SSH 로 chromium 을 띄우면 세션 밖이라 창이 안 뜨므로(검증됨),
#    labwc autostart(세션 내부)로 브릿지+키오스크를 함께 올린다.
cp "${HERE}/kiosk.sh" "${APP_DIR}/kiosk.sh" 2>/dev/null || true
chmod +x "${APP_DIR}/kiosk.sh" 2>/dev/null || true
sudo apt-get install -y -qq swayidle wtype 2>/dev/null || true

if [ -d /usr/bin ] && command -v labwc >/dev/null 2>&1 || [ -d "${HOME_DIR}/.config/labwc" ] || true; then
  # labwc(Wayland) — 권장 (브릿지+키오스크 일괄, 시리얼 중복 방지 포함)
  mkdir -p "${HOME_DIR}/.config/labwc"
  cp "${HERE}/labwc-autostart" "${HOME_DIR}/.config/labwc/autostart"
  chmod +x "${HOME_DIR}/.config/labwc/autostart"
  echo "[install] labwc autostart 등록 (브릿지+키오스크) — 재부팅 시 자동 기동"
fi
# (구형 LXDE/X11 폴백) — .config/autostart .desktop
AUTOSTART_DIR="${HOME_DIR}/.config/autostart"
mkdir -p "${AUTOSTART_DIR}"
cat > "${AUTOSTART_DIR}/sentinel-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=ThinQ Sentinel Kiosk
Exec=${APP_DIR}/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF
chown -R "${USER_NAME}:${USER_NAME}" "${APP_DIR}" "${HOME_DIR}/.config" || true

echo
echo "[install] 완료 ✅  → 재부팅하면 브릿지+대시보드 자동 기동"
echo "  - labwc(Bookworm/Wayland): ~/.config/labwc/autostart 가 브릿지+키오스크 일괄 기동"
echo "  - 브릿지 로그: tail -f ~/bridge.log"
echo "  - 브릿지 systemd 대안: sudo systemctl status sentinel-bridge"
