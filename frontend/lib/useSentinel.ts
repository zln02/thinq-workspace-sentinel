"use client";
// 백엔드(:8003) 실연동 데이터 훅 — next.config 프록시(/api/sentinel/*) 경유.
//   /api/sentinel/...        → http://127.0.0.1:8003/api/v1/...
//   /api/sentinel/stream/... → http://127.0.0.1:8003/api/v1/stream/...
import { useEffect, useState } from "react";

// 배포(basePath=/sentinel) 시 fetch/SSE가 /sentinel/api/... 로 나가야 nginx(/sentinel→:3001)를 거쳐 rewrite됨.
// dev(basePath="")면 빈 문자열이라 기존 /api/... 그대로.
const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export type LiveSensor = {
  space_id: string;
  tier: string;
  prev_tier?: string | null;
  poi: number | null;
  rebreathed_fraction?: number | null;
  co2_ppm: number | null;
  pm25: number | null;
  temp_c: number | null;
  humidity: number | null;
  gas_raw: number | null;
  occupancy?: number | null;  // 실측 재실 인원(LD2410C): 0=빈 병실 / >0=재실. 미측정 시 백엔드 DEMO_OCCUPANCY
  tier_source?: "sensor" | "external";  // 이 tier가 실내센서 감지(sensor)인지 외부 조기경보 상향(external)인지
  boost_region?: string | null;         // tier_source=external일 때 발령 지역(예: 부산광역시)
  governance: string;
  approval_required: boolean;
  formula?: Record<string, unknown>;
};

/** 실센서 병동(ward_a=201호) SSE 실시간 구독.
 *  lastTs: 마지막 데이터 수신 시각(ms). 끊김 시 stale 판단에 사용. */
export function useLiveWard(spaceId = "ward_a") {
  const [data, setData] = useState<LiveSensor | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastTs, setLastTs] = useState<number | null>(null);

  // 초기 1회 REST 폴백 — SSE 첫 이벤트 전(또는 SSE 차단 환경)에도 첫 화면이 뜨도록.
  // overview에서 실센서 공간 스냅샷을 LiveSensor로 매핑해 채운다. SSE sensor가 오면 그쪽이 우선.
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/sentinel/sensor/spaces/overview`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j?.spaces?.length) return;
        const sp = j.spaces.find((s: SpaceOverview) => s.source === "실센서") ?? j.spaces[0];
        if (!sp) return;
        setData((prev) =>
          prev ?? {
            space_id: sp.space_id, tier: sp.tier, poi: sp.poi,
            co2_ppm: sp.co2_ppm, pm25: sp.pm25, temp_c: sp.temp_c, humidity: sp.humidity,
            gas_raw: sp.gas_raw, occupancy: null, governance: "none", approval_required: false,
          }
        );
        setLastTs((prev) => prev ?? Date.now());
      })
      .catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [spaceId]);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/sentinel/stream/live/${spaceId}`);
    es.addEventListener("live_init", () => setConnected(true));
    es.addEventListener("sensor", (e) => {
      try {
        setData(JSON.parse((e as MessageEvent).data));
        setConnected(true);
        setLastTs(Date.now());
      } catch {
        /* ignore */
      }
    });
    // EventSource는 onerror 후 자동 재연결 시도. 끊김만 표시(데이터는 stale로 유지).
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [spaceId]);
  return { data, connected, lastTs };
}

export type SpaceOverview = {
  space_id: string;
  space_name: string;
  space_type: string;
  area_m2?: number;
  max_occupancy: number;
  tier: string;
  tier_source?: "sensor" | "external";  // 이 공간 tier가 외부 조기경보발(發) 상향이면 "external"
  poi: number | null;
  source: string;       // "실센서" | "시뮬"
  gas_raw: number | null;
  temp_c: number | null;
  humidity: number | null;
  co2_ppm: number | null;
  pm25: number | null;
};

/** 전 공간 위험도(다병동 그리드·집계용) 폴링. */
export function useSpacesOverview(intervalMs = 5000) {
  const [spaces, setSpaces] = useState<SpaceOverview[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/sensor/spaces/overview`);
        const j = await r.json();
        if (alive && j.spaces) setSpaces(j.spaces);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return spaces;
}

/** 외부 감염 신호 선제 boost tier (선택지역 risk_score 기반). overview의 boost 필드. */
export function useExternalBoost(intervalMs = 8000) {
  const [boost, setBoost] = useState<string>("MONITOR");
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API_BASE}/api/sentinel/sensor/spaces/overview`)
        .then((r) => r.json())
        .then((j) => { if (alive && j.boost) setBoost(j.boost); })
        .catch(() => {});
    load();
    const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [intervalMs]);
  return boost;
}

export type ControlPlanDevice = { device: string; name_kr: string; setting?: string; reason: string };
export type ControlPlan = {
  space_id: string;
  pathogen: string;
  tier: string;
  season: string;
  intensity: number;
  rationale: string;
  tier_source: string;
  applied: ControlPlanDevice[];
  skipped: ControlPlanDevice[];
};

/** 가전 제어계획 — 현재 tier(+병원체·계절) → 가전 8종 타깃 세팅+사유. tier 변할 때 재조회. */
export function useControlPlan(spaceId = "ward_a", tier?: string | null) {
  const [plan, setPlan] = useState<ControlPlan | null>(null);
  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ space_id: spaceId });
    if (tier) q.set("tier", tier);
    fetch(`${API_BASE}/api/sentinel/sensor/control-plan?${q.toString()}`)
      .then((r) => r.json())
      .then((j) => { if (alive && Array.isArray(j.applied)) setPlan(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [spaceId, tier]);
  return plan;
}

/** 코웨이 공기청정기 실시간 상태 폴링. */
export function useCowayStatus(intervalMs = 8000) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/sensor/coway-status`);
        const j = await r.json();
        if (alive) setStatus(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return status;
}

/** 삼성 에어컨(SmartThings) 상태 폴링. */
export function useAcStatus(intervalMs = 10000) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/sensor/ac-status`);
        const j = await r.json();
        if (alive) setStatus(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return status;
}

export type Kpi = {
  auto_actions: number;
  avg_poi: number;
  poi_reduction_pct: number;
  spaces_monitored: number;
  source: string;
};

/** Performance Tracker(경영성과 24h) 폴링. */
export function useKpi(intervalMs = 30000) {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/sensor/kpi`);
        const j = await r.json();
        if (alive) setKpi(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return kpi;
}

export type DirectorReport = {
  period: { start: string | null; end: string | null; days: number };
  auto_actions: number;
  preemptive_actions?: number;   // 외부 조기경보발 선제 대응(센서 정상이어도 미리 가동)
  sensor_actions?: number;       // 실내센서 감지발 대응
  alert_events: number;
  avg_poi: number;
  peak_poi: number;
  poi_reduction_pct: number;
  spaces_monitored: number;
  readings: number;
  est_cost_saved_krw: number;
  compliance_pct: number;
  max_lead_days?: number | null;     // 외부 조기경보가 확진피크보다 며칠 선행했나(최대)
  preempt_region?: string | null;    // 그 지역
  preempt_disease?: string | null;   // 그 질환
  weekly: { week: string; date?: string; actions: number; est_saved_krw: number }[];
  source: string;
};

/** 병원장(시설장) 경영 리포트 — 최근 N일 실측 집계 폴링. */
export function useReport(days = 30, intervalMs = 30000) {
  const [report, setReport] = useState<DirectorReport | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/sensor/report?days=${days}`);
        const j = await r.json();
        if (alive) setReport(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [days, intervalMs]);
  return report;
}

// ── 외부 조기경보 boost 토글 (시연용 선제 시나리오 ON/OFF) ──────────────
//  select-region: 지역 선택 → 조기경보 등급으로 전 병동 tier 선제 상향(가전 자동가동까지 연쇄)
//  clear-region : 해제 → 전 병동이 센서 실측 tier로 복귀
//  데모 모드(SENTINEL_API_KEY 미설정)에선 헤더 없이 통과. 운영 시 키 헤더 필요.

/** 시연 선제 시나리오 ON — 지역 조기경보 발령 재현(replay=시즌피크 / live=현재 실시간). */
export async function selectRegion(region: string, mode: "replay" | "live" = "replay") {
  try {
    const r = await fetch(`${API_BASE}/api/sentinel/external/select-region`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, mode }),
    });
    return await r.json();
  } catch {
    return null;
  }
}

/** 시연 선제 시나리오 OFF — 외부 boost 해제(평상시 복귀). */
export async function clearRegion() {
  try {
    const r = await fetch(`${API_BASE}/api/sentinel/external/clear-region`, { method: "POST" });
    return await r.json();
  } catch {
    return null;
  }
}

export type BoostState = {
  region: string | null;
  boost_tier: string;        // MONITOR | CAUTION | ALERT | ...
  mode: string | null;       // replay | live | null
  info?: Record<string, unknown> | null;
};

/** 현재 외부 boost 상태 폴링 — 토글 버튼 ON/OFF 표시 + 인과 배지용. */
export function useBoostState(intervalMs = 5000) {
  const [boost, setBoost] = useState<BoostState | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/external/selected`);
        const j = await r.json();
        if (alive) setBoost(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return boost;
}

// ── 자동/수동 제어 모드 (모드 전환 시 관리자 비밀번호) ─────────────────────
/** 모드 전환 — 관리자 비밀번호 검증(서버). 성공 {ok:true,mode} / 실패 {ok:false}. */
export async function setControlMode(spaceId: string, mode: "auto" | "manual", password: string) {
  try {
    const r = await fetch(`${API_BASE}/api/sentinel/sensor/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId, mode, password }),
    });
    if (r.status === 403) return { ok: false, reason: "관리자 비밀번호가 올바르지 않습니다" };
    return await r.json();
  } catch {
    return { ok: false, reason: "통신 오류" };
  }
}

/** 현재 제어 모드(auto/manual) 폴링. */
export function useControlMode(spaceId: string, intervalMs = 6000) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API_BASE}/api/sentinel/sensor/mode?space_id=${spaceId}`)
        .then((r) => r.json())
        .then((j) => { if (alive && j.mode) setMode(j.mode); })
        .catch(() => {});
    load();
    const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [spaceId, intervalMs]);
  return mode;
}

/** 제어 명령 (코웨이/에어컨 ON·OFF·급속 등). */
export async function sendControl(action: string, spaceId = "ward_a") {
  try {
    const r = await fetch(`${API_BASE}/api/sentinel/sensor/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId, action }),
    });
    return await r.json();
  } catch {
    return null;
  }
}

/** 대기 중인 고위험(HIGH_RISK/CRITICAL) 제어 승인 실행. */
export async function sendApprove(spaceId = "ward_a") {
  try {
    const r = await fetch(`${API_BASE}/api/sentinel/sensor/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId }),
    });
    return await r.json();
  } catch {
    return null;
  }
}

export type RegionSignal = {
  region: string;
  disease: string;
  level: string;
  live_score: number | null;
  live_level: string;
  peak_level: string;
  conf_peak_date: string | null;
  lead_days: number | null;
  per_100k: number | null;
};

/** 외부 신호 메타(최종 데이터 기준일·출처기관) — 배너 '최종 갱신' 동기화용. */
export function useExternalMeta(intervalMs = 60000) {
  const [meta, setMeta] = useState<{ as_of: string | null; source: string | null }>({ as_of: null, source: null });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API_BASE}/api/sentinel/external/regions`)
        .then((r) => r.json())
        .then((j) => { if (alive) setMeta({ as_of: j.as_of ?? null, source: j.source ?? null }); })
        .catch(() => {});
    load();
    const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [intervalMs]);
  return meta;
}

/** 외부 감염병 조기경보(질병청·UIS 연동) 전국 지역 신호 폴링 — 선제 예방 차별점. */
export function useExternalSignal(intervalMs = 60000) {
  const [regions, setRegions] = useState<RegionSignal[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sentinel/external/regions`);
        const j = await r.json();
        if (alive && j.regions) setRegions(j.regions);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return regions;
}
