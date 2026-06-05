// frontend/lib/useDemoStream.ts
// 시연 전용 SSE 실시간 구독 훅 — /api/v1/stream/demo/{scenario} 를 직접 EventSource 로 소비.
// 백엔드(:8003)에 직결한다(Next rewrite 의 SSE 버퍼링 회피). 3역할(관리자/간호사/보호자)이
// 같은 훅 상태를 구독해 각자 다른 뷰로 렌더한다.
// 발표장 네트워크 장애 대비: 재연결 3회 실패 시 FALLBACK_FRAMES 로 자동 전환(오프라인 데모).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Tier = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

export interface DemoSnapshot {
  space_id: string;
  t_min: number;
  temp_c: number;
  rh: number;
  co2: number;
  pm25: number;
  occupancy: number;
  volume_m3?: number;
  virus_conc: number;
  fresh_air_ach: number;
  inferred_ach?: number;
  pathogen: string;
  infected_count: number;
  poi: number;
  r_event: number;
  tier: Tier;
  iaq_over?: string[];
  sensors: { id: string; type: string; value: number; unit: string }[];
}

export interface DeviceSummaryItem {
  type: string;
  alias: string;
  mode: string;
  auto: boolean;
}

export interface ProtocolPayload {
  pathogen: string;
  tier: Tier;
  season: string;
  rationale: string;
  actions_count: number;
  applied_count: number;
  device_summary: DeviceSummaryItem[];
  manual_required: string[];
}

export interface ExternalSignalPayload {
  source: string;
  pathogen: string;
  region: string;
  signal_level: string;
  lead_weeks: number;
  boost_applied: boolean;
  pre_boost_tier: Tier;
  post_boost_tier: Tier;
}

export type StreamStatus = "idle" | "streaming" | "done" | "fallback";

const API_BASE =
  process.env.NEXT_PUBLIC_SENTINEL_API ?? "http://localhost:8003";

export interface DemoStreamState {
  status: StreamStatus;
  scenario: string | null;
  latest: DemoSnapshot | null;
  snapshots: DemoSnapshot[];
  protocol: ProtocolPayload | null;
  external: ExternalSignalPayload | null;
  start: (scenario: string, speed?: number) => void;
  stop: () => void;
}

export function useDemoStream(): DemoStreamState {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [scenario, setScenario] = useState<string | null>(null);
  const [latest, setLatest] = useState<DemoSnapshot | null>(null);
  const [snapshots, setSnapshots] = useState<DemoSnapshot[]>([]);
  const [protocol, setProtocol] = useState<ProtocolPayload | null>(null);
  const [external, setExternal] = useState<ExternalSignalPayload | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const fbTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (fbTimer.current) {
      clearInterval(fbTimer.current);
      fbTimer.current = null;
    }
  }, []);

  const activateFallback = useCallback((sc: string) => {
    cleanup();
    const set = FALLBACK_FRAMES[sc] ?? FALLBACK_FRAMES.winter_influenza;
    setStatus("fallback");
    setExternal(set.external);
    setProtocol(set.protocol);
    setSnapshots([set.frames[0]]);
    setLatest(set.frames[0]);
    let i = 1;
    fbTimer.current = setInterval(() => {
      if (i >= set.frames.length) {
        if (fbTimer.current) clearInterval(fbTimer.current);
        setStatus("done");
        return;
      }
      const f = set.frames[i];
      setLatest(f);
      setSnapshots((p) => [...p, f]);
      i += 1;
    }, 700);
  }, [cleanup]);

  const connect = useCallback(
    (sc: string, speed: number) => {
      esRef.current?.close();
      const url = `${API_BASE}/api/v1/stream/demo/${sc}?speed=${speed}&total_minutes=120`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("init", (e) => {
        retryRef.current = 0; // 연결 성공 → 재시도 카운터 리셋(누적 fallback 방지)
        const d = JSON.parse((e as MessageEvent).data);
        setLatest(d.space);
        setSnapshots([d.space]);
      });
      es.addEventListener("external_signal", (e) => {
        setExternal(JSON.parse((e as MessageEvent).data));
      });
      es.addEventListener("protocol_applied", (e) => {
        setProtocol(JSON.parse((e as MessageEvent).data));
      });
      es.addEventListener("snapshot", (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setLatest(d);
        setSnapshots((p) => [...p, d]);
      });
      es.addEventListener("done", (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setLatest(d);
        setSnapshots((p) => [...p, d]); // 마지막 프레임 누락 방지(Sparkline 끝점)
        setStatus("done");
        es.close();
        esRef.current = null;
      });
      es.onerror = () => {
        es.close();
        retryRef.current += 1;
        if (retryRef.current <= 3) {
          setTimeout(() => connect(sc, speed), 1500);
        } else {
          activateFallback(sc);
        }
      };
    },
    [activateFallback]
  );

  const start = useCallback(
    (sc: string, speed = 40) => {
      cleanup();
      retryRef.current = 0;
      setScenario(sc);
      setStatus("streaming");
      setLatest(null);
      setSnapshots([]);
      setProtocol(null);
      setExternal(null);
      connect(sc, speed);
    },
    [cleanup, connect]
  );

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { status, scenario, latest, snapshots, protocol, external, start, stop };
}

/* ───────── 오프라인 폴백 프레임 (발표 백업) ─────────
   백엔드/네트워크 장애 시에도 시연이 끊기지 않도록 대표 곡선을 내장.
   물리 정밀값이 아니라 발표 연속성용 근사 프레임이다. */
type FallbackSet = {
  external: ExternalSignalPayload;
  protocol: ProtocolPayload;
  frames: DemoSnapshot[];
};

function frame(t: number, co2: number, poi: number, tier: Tier, rh: number): DemoSnapshot {
  return {
    space_id: "ward_a", t_min: t, temp_c: 22, rh, co2, pm25: 14,
    occupancy: 8, volume_m3: 121.5, virus_conc: poi * 4, fresh_air_ach: tier === "HIGH_RISK" ? 0.5 : 6,
    inferred_ach: 3, pathogen: "INFLUENZA", infected_count: 1,
    poi, r_event: poi * 7, tier,
    sensors: [{ id: "co2-1", type: "CO2", value: co2, unit: "ppm" }],
  };
}

const FALLBACK_FRAMES: Record<string, FallbackSet> = {
  winter_influenza: {
    external: {
      source: "KOWAS 약국 OTC", pathogen: "INFLUENZA", region: "서울 종로구",
      signal_level: "HIGH", lead_weeks: 3, boost_applied: true,
      pre_boost_tier: "CAUTION", post_boost_tier: "HIGH_RISK",
    },
    protocol: {
      pathogen: "INFLUENZA", tier: "HIGH_RISK", season: "winter",
      rationale: "Lowen 2007: 저온·저습 시 비말 안정성↑ → 22°C · 50% 유지",
      actions_count: 4, applied_count: 4,
      device_summary: [
        { type: "AIR_PURIFIER", alias: "공기청정기", mode: "TURBO", auto: true },
        { type: "VENTILATOR", alias: "환기청정기", mode: "MAX 환기", auto: true },
        { type: "HUMIDIFIER", alias: "가습기", mode: "RH 50%", auto: true },
        { type: "BOILER", alias: "보일러", mode: "난방 22℃", auto: true },
      ],
      manual_required: ["고위험 환자 항바이러스제 투여 검토", "병동 출입 방문객 마스크 안내"],
    },
    frames: [
      frame(0, 690, 0.02, "CAUTION", 32),
      frame(15, 760, 0.05, "CAUTION", 34),
      frame(30, 880, 0.11, "ALERT", 37),
      frame(45, 1010, 0.19, "HIGH_RISK", 41),
      frame(60, 940, 0.16, "HIGH_RISK", 46),
      frame(75, 780, 0.10, "ALERT", 49),
      frame(90, 660, 0.06, "CAUTION", 50),
      frame(105, 610, 0.03, "CAUTION", 50),
      frame(120, 600, 0.02, "MONITOR", 50),
    ],
  },
};
