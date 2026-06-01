"use client";
import { useState } from "react";
import { FloorPlan } from "@/components/FloorPlan";

export default function AdminPage() {
  const [persona, setPersona] = useState<"ICN" | "DIRECTOR" | "FM">("ICN");

  return (
    <main className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-lg-primary">중앙 관제 대시보드</h1>
          <p className="text-sm text-slate-500">
            {persona === "ICN" && "이정희 · 감염관리 간호사 (ICN)"}
            {persona === "DIRECTOR" && "박원장 · 원장 (CEO)"}
            {persona === "FM" && "장혁준 · 시설관리팀장 (FM)"}
          </p>
        </div>
        <div className="flex gap-2">
          {(["ICN", "DIRECTOR", "FM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPersona(p)}
              className={`px-3 py-1 rounded text-sm ${
                persona === p ? "bg-lg-primary text-white" : "bg-white border"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <FloorPlan snapshots={{}} onRoomClick={(c) => alert(`병실 ${c}호 상세 (TODO W3)`)} />

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
        🚧 <b>W3 작업 예정</b>: SSE 실시간 푸시 연결 · 5-Tier 컬러 자동 갱신 · 병실 상세 모달 · 알림 센터
      </div>
    </main>
  );
}
