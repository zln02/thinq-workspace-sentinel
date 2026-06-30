import {
  ShieldCheck, Eye, AlertTriangle, AlertOctagon, Siren, type LucideIcon,
} from "lucide-react";

export type Tier = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

// 5단계 위험 티어 — 단일 소스(Single Source of Truth).
// 중복 인코딩(WCAG 2.2 §1.4.1): 색 + 이모지/아이콘 글리프 + 한글 라벨 + rank 정렬.
// 긴급도 단조 증가(정상→심각). 솔리드 배지(bg+text)는 tailwind tier 토큰, 흰 배경 텍스트는 fg(AA ≥4.5:1).
export interface TierMetaItem {
  label: string;      // 한글 라벨
  bg: string;         // 솔리드 배지 배경(tailwind tier 토큰)
  text: string;       // 솔리드 배지 글자색
  emoji: string;      // 색맹 보조 글리프
  Icon: LucideIcon;   // 라인 아이콘(중복 인코딩)
  rank: number;       // 0..4 비교·정렬
  fg: string;         // 흰 배경 위 텍스트색(AA)
  bgSoft: string;     // 연한 틴트 hex
  border: string;     // 좌측 액센트/테두리 hex
}
export const TIER_META: Record<Tier, TierMetaItem> = {
  MONITOR:    { label: "정상", bg: "bg-tier-monitor",  text: "text-white",      emoji: "🟢", Icon: ShieldCheck,   rank: 0, fg: "#15803d", bgSoft: "#ecfdf3", border: "#22c55e" },
  CAUTION:    { label: "주의", bg: "bg-tier-caution",  text: "text-slate-900",  emoji: "🟡", Icon: Eye,           rank: 1, fg: "#a16207", bgSoft: "#fefbeb", border: "#f59e0b" },
  ALERT:      { label: "경계", bg: "bg-tier-alert",    text: "text-white",      emoji: "🟠", Icon: AlertTriangle, rank: 2, fg: "#c2410c", bgSoft: "#fff4ec", border: "#f97316" },
  HIGH_RISK:  { label: "위험", bg: "bg-tier-high",     text: "text-white",      emoji: "🔴", Icon: AlertOctagon,  rank: 3, fg: "#b91c1c", bgSoft: "#fdecec", border: "#ef4444" },
  CRITICAL:   { label: "심각", bg: "bg-tier-critical", text: "text-white",      emoji: "⚫", Icon: Siren,         rank: 4, fg: "#9f1239", bgSoft: "#fbe9ee", border: "#9f1239" },
};

export const TIER_ORDER: Tier[] = ["MONITOR", "CAUTION", "ALERT", "HIGH_RISK", "CRITICAL"];

// 안전 정규화 — 미지/누락 tier 는 정상으로 폴백.
export function tierMeta(t?: string | null): TierMetaItem {
  return (t && TIER_META[t as Tier]) || TIER_META.MONITOR;
}

// 단일 소스 헬퍼 — 코드 전역의 rank/label 중복 정의를 대체.
export function tierRank(t?: string | null): number {
  return tierMeta(t).rank;
}
export function tierKo(t?: string | null): string {
  return t ? tierMeta(t).label : "—";
}
// 의미 술어 — 매직넘버(>=1/2/3) 대신 사용.
export const isAtRisk = (t?: string | null) => tierRank(t) >= 1;   // CAUTION+
export const isActive = (t?: string | null) => tierRank(t) >= 2;   // ALERT+ (자동대응)
export const isCritical = (t?: string | null) => tierRank(t) >= 4; // CRITICAL

export interface Snapshot {
  space_id: string;
  t_min: number;
  temp_c: number;
  rh: number;
  co2: number;
  pm25: number;
  occupancy: number;
  virus_conc: number;
  surface_contam: number;
  fresh_air_ach: number;
  pathogen: string;
  infected_count: number;
  poi: number;
  r_event: number;
  tier: Tier;
  sensors: { id: string; type: string; value: number; unit: string }[];
}
