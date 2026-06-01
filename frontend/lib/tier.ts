export type Tier = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

export const TIER_META: Record<Tier, { label: string; bg: string; text: string; emoji: string }> = {
  MONITOR:    { label: "Monitor",   bg: "bg-tier-monitor",   text: "text-white", emoji: "🟢" },
  CAUTION:    { label: "Caution",   bg: "bg-tier-caution",   text: "text-slate-900", emoji: "🟡" },
  ALERT:      { label: "Alert",     bg: "bg-tier-alert",     text: "text-white", emoji: "🟠" },
  HIGH_RISK:  { label: "High Risk", bg: "bg-tier-high",      text: "text-white", emoji: "🔴" },
  CRITICAL:   { label: "Critical",  bg: "bg-tier-critical",  text: "text-white", emoji: "⚫" },
};

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
