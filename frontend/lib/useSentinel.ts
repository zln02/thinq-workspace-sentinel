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
  governance: string;
  approval_required: boolean;
  formula?: Record<string, unknown>;
};

/** 실센서 병동(ward_a=201호) SSE 실시간 구독. */
export function useLiveWard(spaceId = "ward_a") {
  const [data, setData] = useState<LiveSensor | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const es = new EventSource(`/api/sentinel/stream/live/${spaceId}`);
    es.addEventListener("live_init", () => setConnected(true));
    es.addEventListener("sensor", (e) => {
      try {
        setData(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [spaceId]);
  return { data, connected };
}

export type SpaceOverview = {
  space_name: string;
  space_type: string;
  max_occupancy: number;
  tier: string;
  poi: number | null;
  source: string;
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
