"use client";
import { useState, useEffect } from "react";
import FloorPlan from "@/components/domain/FloorPlan";
import TierBadge from "@/components/domain/TierBadge";

const TIMELINE = [
  { t: 0,  message: "🟢 전 시설 정상 모니터링 중..." },
  { t: 15, message: "🟡 208호 → Caution 감지" },
  { t: 30, message: "🟠 208호 → Alert! 자동 환기 시작" },
  { t: 45, message: "⚡ 가전 8종 자동 가동 중..." },
  { t: 60, message: "📱 보호자 푸시: 병실 208호 환기 완료, 안전" },
];

export default function DemoPage() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(TIMELINE[0].message);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        const match = [...TIMELINE].reverse().find((t) => next >= t.t);
        if (match) setCurrent(match.message);
        if (next >= 60) { setRunning(false); return 60; }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  function reset() { setElapsed(0); setRunning(false); setCurrent(TIMELINE[0].message); }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-[#A50034] mb-2">💡 75초 시연 모드</h1>
      <p className="text-gray-500 text-sm mb-6">자동 재생 — 실제 감염 대응 시나리오</p>

      {/* 상태 메시지 */}
      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6 text-center">
        <p className="text-lg font-semibold text-gray-700">{current}</p>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
          <div
            className="bg-[#A50034] h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(elapsed / 60) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{elapsed}s / 60s</p>
      </div>

      {/* 타임라인 */}
      <div className="flex flex-col gap-2 mb-6">
        {TIMELINE.map((t, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
              elapsed >= t.t ? "bg-[#FCE8EE] text-[#A50034] font-semibold" : "bg-white text-gray-400 border"
            }`}
          >
            <span className="w-10">{t.t}s</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setRunning(true)}
          disabled={running || elapsed >= 60}
          className="bg-[#A50034] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#7B0027] transition disabled:opacity-50"
        >
          ▶ 시연 시작
        </button>
        <button
          onClick={reset}
          className="border px-6 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition"
        >
          ↺ 초기화
        </button>
      </div>

      <FloorPlan />
    </div>
  );
}