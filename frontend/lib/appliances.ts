// 가전 오케스트레이션 + tier 색(키오스크 대시보드 → Next.js 포팅)
import { Wind, AirVent, Fan, Droplets, Flame, Bot, Shirt, type LucideIcon } from "lucide-react";

export type Tier = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

export const RANK: Record<Tier, number> = {
  MONITOR: 0, CAUTION: 1, ALERT: 2, HIGH_RISK: 3, CRITICAL: 4,
};

// 임상 색(색맹 인지 고려) — SVG/인라인용 hex
export const TIER_HEX: Record<Tier, { c: string; bg: string; ko: string }> = {
  MONITOR:   { c: "#1a7a45", bg: "#eaf7ef", ko: "정상" },
  CAUTION:   { c: "#b45309", bg: "#fdf6e8", ko: "주의" },
  ALERT:     { c: "#c2410c", bg: "#fdefe6", ko: "경보" },
  HIGH_RISK: { c: "#dc2626", bg: "#fdeced", ko: "고위험" },
  CRITICAL:  { c: "#9f1239", bg: "#fbe9ee", ko: "위급" },
};

export interface Appliance {
  n: string;
  lever: string;
  icon: LucideIcon;
  live?: boolean;            // 실연동(코웨이) 가전
  act: (t: Tier) => string;  // tier별 동작 상태
}

const ge = (t: Tier, n: number) => RANK[t] >= n;

export const APPLIANCES: Appliance[] = [
  { n: "공기청정기", lever: "여과 λ", icon: Wind, live: true,
    act: (t) => (ge(t, 2) ? "급속" : ge(t, 1) ? "자동" : "대기") },
  { n: "에어컨", lever: "온도·Q_aux", icon: AirVent,
    act: (t) => (ge(t, 2) ? "송풍/제습" : ge(t, 1) ? "순환" : "대기") },
  { n: "환기장치", lever: "환기량 Q (ACH)", icon: Fan,
    act: (t) => (ge(t, 2) ? "ACH 6+" : ge(t, 1) ? "ACH 4" : "ACH 2") },
  { n: "가습/제습", lever: "습도 40~60%", icon: Droplets,
    act: (t) => (ge(t, 1) ? "RH 보정" : "유지") },
  { n: "보일러", lever: "온도↑", icon: Flame, act: () => "계절 연동" },
  { n: "로봇청소기", lever: "표면 살균", icon: Bot,
    act: (t) => (ge(t, 3) ? "표면 살균" : "정기") },
  { n: "스타일러", lever: "의류 살균", icon: Shirt,
    act: (t) => (ge(t, 2) ? "의류 살균" : "대기") },
];

export const appOn = (act: string) =>
  !["대기", "유지", "정기", "계절 연동", "기본"].includes(act);

export type SpaceType = "WARD" | "ISOLATION" | "DINING" | "LOUNGE";
export const ROOM_TYPE_LABEL: Record<string, string> = {
  WARD: "다인실", ISOLATION: "음압격리실", DINING: "공용식당", LOUNGE: "휴게실",
};
