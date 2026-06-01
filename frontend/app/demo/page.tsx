"use client";
import { useEffect, useState } from "react";
import { FloorPlan } from "@/components/FloorPlan";
import type { Snapshot } from "@/lib/tier";

const DEMO_SCENARIO = "winter_influenza";

export default function DemoPage() {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot | undefined>>({});
  const [phase, setPhase] = useState("준비");

  useEffect(() => {
    setPhase("연결 중…");
    const es = new EventSource(`/api/sentinel/stream/demo/${DEMO_SCENARIO}?speed=120&total_minutes=120`);

    es.addEventListener("init", (e) => {
      setPhase("⚠️ 외부 신호 감지 — KOWAS 인플루엔자 +43%");
      const data = JSON.parse((e as MessageEvent).data);
      setSnapshots({ "601": data.space });
    });
    es.addEventListener("protocol_applied", () => {
      setPhase("🔧 Smart Protocol 자동 가전 제어 시작");
    });
    es.addEventListener("snapshot", (e) => {
      const data: Snapshot = JSON.parse((e as MessageEvent).data);
      setSnapshots((prev) => ({ ...prev, "601": data }));
      setPhase(`▶ ${(data.t_min / 60).toFixed(1)}h · ${data.tier} · PoI ${(data.poi * 100).toFixed(2)}%`);
    });
    es.addEventListener("done", () => {
      setPhase("✅ 시연 종료 — CRITICAL → MONITOR 전환 완료");
      es.close();
    });
    es.onerror = () => {
      setPhase("❌ SSE 연결 실패 — 백엔드 가동 확인 (port 8003)");
      es.close();
    };
    return () => es.close();
  }, []);

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-lg-primary">75초 시연 — 자동 재생</h1>
          <p className="text-sm text-slate-500">시나리오: {DEMO_SCENARIO} · 가속 120배</p>
        </div>
        <div className="px-4 py-2 bg-lg-primary text-white rounded font-bold">{phase}</div>
      </header>

      <FloorPlan snapshots={snapshots} />
    </main>
  );
}
