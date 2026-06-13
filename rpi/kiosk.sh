#!/usr/bin/env bash
# ThinQ Sentinel 키오스크 — 크로미움 풀스크린으로 실시간 대시보드 자동 표출.
# 라파이 데스크톱 autostart 또는 systemd --user 로 기동.
set -e

# 대시보드 URL — Next 통합 앱. 레거시 :8003/dashboard 제거됨(FM 뷰로 흡수).
# /sentinel 로그인에서 역할 카드 선택 → 해당 관제 뷰. 환경변수로 override 가능.
URL="${SENTINEL_DASHBOARD:-http://100.96.227.23:3001/sentinel}"
# 백엔드 헬스 체크 URL (대기용, 고정)
HEALTH_URL="${SENTINEL_HEALTH:-http://100.96.227.23:8003/health}"

# 화면보호기/절전 비활성 (시연 중 화면 꺼짐 방지)
export DISPLAY="${DISPLAY:-:0}"
xset s off || true
xset -dpms || true
xset s noblank || true

# 크로미움 바이너리 자동 탐색 (chromium / chromium-browser)
CHROME="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROME" ]; then
  echo "[kiosk] chromium 미설치 — sudo apt install -y chromium-browser" >&2
  exit 1
fi

# 백엔드가 살아날 때까지 대기 (부팅 직후 네트워크/백엔드 레이스 방지)
for i in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" -o /dev/null 2>/dev/null; then break; fi
  sleep 2
done

# 이전 크래시 플래그 제거 (복구 팝업 없이 깔끔히 재시작)
PROFILE="$HOME/.config/chromium"
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' \
  "$PROFILE/Default/Preferences" 2>/dev/null || true

exec "$CHROME" \
  --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --disable-features=TranslateUI --no-first-run --fast --fast-start \
  --check-for-update-interval=31536000 \
  --overscroll-history-navigation=0 --incognito \
  "$URL"
