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

/** 제어 명령 (코웨이/에어컨 ON·OFF·급속 등). */
export async function sendControl(action: string, spaceId = "ward_a") {
  try {
    await fetch(`${API_BASE}/api/sentinel/sensor/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId, action }),
    });
  } catch {
    /* ignore */
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
