"use client";
// 백엔드(:8003) 실연동 데이터 훅 — next.config 프록시(/api/sentinel/*) 경유.
//   /api/sentinel/...        → http://127.0.0.1:8003/api/v1/...
//   /api/sentinel/stream/... → http://127.0.0.1:8003/api/v1/stream/...
import { useEffect, useState } from "react";

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
  useEffect(() => {
    const es = new EventSource(`/api/sentinel/stream/live/${spaceId}`);
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
        const r = await fetch("/api/sentinel/sensor/spaces/overview");
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
      fetch("/api/sentinel/sensor/spaces/overview")
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
    fetch(`/api/sentinel/sensor/control-plan?${q.toString()}`)
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
        const r = await fetch("/api/sentinel/sensor/coway-status");
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
        const r = await fetch("/api/sentinel/sensor/ac-status");
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
        const r = await fetch("/api/sentinel/sensor/kpi");
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

/** 제어 명령 (코웨이/에어컨 ON·OFF·급속 등). */
export async function sendControl(action: string, spaceId = "ward_a") {
  try {
    await fetch("/api/sentinel/sensor/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId, action }),
    });
  } catch {
    /* ignore */
  }
}
