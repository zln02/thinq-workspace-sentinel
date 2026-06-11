// 보호자 앱 공유 로직 — 세션(localStorage)·tier 안심상태·알림 이력
// 정직성: "감염 막음" 단정 금지 → "선제 관리·자동 대응" 톤 (m.html STATE 이식)
import type { Tier } from "./tier";

export interface GuardianSession {
  guardian: string; // 보호자 이름
  patient: string; // 환자(어르신) 이름
  room: string; // 병실
  space_id: string; // 연동 공간(데모: ward_a)
}

const SKEY = "sentinel_guardian_session";
const ALERTS_KEY = "sentinel_guardian_alerts";

export function getSession(): GuardianSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SKEY);
    return raw ? (JSON.parse(raw) as GuardianSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: GuardianSession) {
  localStorage.setItem(SKEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SKEY);
}

// tier → 보호자용 안심 상태 (기술용어 숨김)
export interface TierState {
  emoji: string;
  st: string; // 상태 라벨
  msg: string; // 안심 메시지
  c: string; // 강조색
  bg: string; // 카드 배경
  bd: string; // 테두리
}

export const TIER_STATE: Record<Tier, TierState> = {
  MONITOR: { emoji: "🌿", st: "안전", msg: "병동 환경이 쾌적하게 관리되고 있습니다", c: "#15803d", bg: "#eafaf0", bd: "#bfe8cd" },
  CAUTION: { emoji: "🌤️", st: "관리 중", msg: "공기 환기를 권고하고 모니터링을 강화했습니다", c: "#b45309", bg: "#fdf6e8", bd: "#f0dcae" },
  ALERT: { emoji: "🛟", st: "자동 조치 중", msg: "공기청정기를 자동 가동했습니다. 병원이 관리 중이니 안심하세요", c: "#c2410c", bg: "#fdefe6", bd: "#f3cbab" },
  HIGH_RISK: { emoji: "🏥", st: "집중 관리", msg: "의료진이 집중 관리하고 있습니다", c: "#dc2626", bg: "#fdeced", bd: "#f3c0c2" },
  CRITICAL: { emoji: "🚨", st: "긴급 대응", msg: "긴급 방역 절차를 진행 중입니다. 병원이 신속히 대응합니다", c: "#9f1239", bg: "#fbe9ee", bd: "#f0bccd" },
};

export const TIER_RANK: Record<Tier, number> = {
  MONITOR: 0, CAUTION: 1, ALERT: 2, HIGH_RISK: 3, CRITICAL: 4,
};

// 실내 공기 등급(0~4) → LG PuriCare 관행 색(좋음=파랑) + 한국어 라벨
export const AQ_LABELS = ["—", "좋음", "보통", "나쁨", "매우 나쁨"];
export const AQ_COLORS = ["#71717a", "#0a84ff", "#34c759", "#ff9f0a", "#ff3b30"];

// 개별 수치 → 좋음/주의/나쁨 색 (warn·bad 임계 기준)
export function metricColor(v: number | null, warn: number, bad: number): string {
  if (v == null) return "#a1a1aa";
  if (v >= bad) return "#ff3b30";
  if (v >= warn) return "#ff9f0a";
  return "#34c759";
}

export function tierState(tier?: string | null): TierState {
  return TIER_STATE[(tier as Tier) ?? "MONITOR"] ?? TIER_STATE.MONITOR;
}

// 알림 이력 (tier 전환 시 누적)
export interface AlertItem {
  ts: number;
  tier: Tier;
  st: string;
  msg: string;
}

export function getAlerts(): AlertItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]") as AlertItem[];
  } catch {
    return [];
  }
}

export function pushAlert(tier: Tier, tsMs: number) {
  const s = TIER_STATE[tier];
  if (!s) return;
  const list = getAlerts();
  list.unshift({ ts: tsMs, tier, st: s.st, msg: s.msg });
  localStorage.setItem(ALERTS_KEY, JSON.stringify(list.slice(0, 50)));
}

// 알림 수신 on/off (OS 권한과 별개로 앱 차원에서 끔 — P0: granted여도 끌 수 있게)
const NOTIF_KEY = "sentinel_guardian_notif";
export function getNotifEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NOTIF_KEY) === "1";
}
export function setNotifEnabled(on: boolean) {
  localStorage.setItem(NOTIF_KEY, on ? "1" : "0");
}

export function relTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
