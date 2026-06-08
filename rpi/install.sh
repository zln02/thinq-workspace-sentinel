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

# 4) 키오스크 autostart (LXDE/Wayfire 데스크톱 세션)
cp "${HERE}/kiosk.sh" "${APP_DIR}/kiosk.sh"
chmod +x "${APP_DIR}/kiosk.sh"
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
echo "[install] 완료 ✅"
echo "  - 브릿지: sudo systemctl status sentinel-bridge   (로그: journalctl -u sentinel-bridge -f)"
echo "  - 키오스크: 재부팅 또는 데스크톱 재로그인 시 자동 풀스크린"
echo "  - 수동 키오스크 테스트: ${APP_DIR}/kiosk.sh"
