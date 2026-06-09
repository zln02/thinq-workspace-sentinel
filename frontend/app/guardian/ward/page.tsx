"use client";
// 병동 상세 — 공기질 4종 + 위험도(PoI) + 코웨이 공기등급
import { useEffect, useState } from "react";
import { useLiveWard, useCowayStatus } from "@/lib/useSentinel";
import { getSession, tierState } from "@/lib/guardian";
import type { Tier } from "@/lib/tier";

const GRADE = ["—", "좋음", "보통", "나쁨", "매우나쁨"];
const GRADE_COLOR = ["#94a3b8", "#15803d", "#b45309", "#c2410c", "#dc2626"];

export default function WardPage() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => setSession(getSession()), []);
  const { data } = useLiveWard(session?.space_id ?? "ward_a");
  const coway = useCowayStatus();

  const tier = (data?.tier as Tier) ?? "MONITOR";
  const s = tierState(tier);
  const poiPct = data?.poi != null ? (data.poi * 100).toFixed(1) : "—";
  const grade = (coway?.aq_grade as number | undefined) ?? 0;
  const cowayCo2 = coway?.co2 as number | undefined;
  const cowayPm = coway?.pm25 as number | undefined;

  const metrics: { k: string; v: number | null; unit: string; warn: number; bad: number }[] = [
    { k: "CO₂", v: data?.co2_ppm ?? cowayCo2 ?? null, unit: "ppm", warn: 1000, bad: 2000 },
    { k: "미세먼지", v: data?.pm25 ?? cowayPm ?? null, unit: "㎍/㎥", warn: 35, bad: 75 },
    { k: "온도", v: data?.temp_c ?? null, unit: "℃", warn: 29, bad: 31 },
    { k: "습도", v: data?.humidity ?? null, unit: "%", warn: 65, bad: 75 },
  ];

  return (
    <div className="flex flex-col">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 bg-[#A50034] text-white">
        <p className="text-[11px] text-white/70">병동 상세</p>
        <h1 className="text-lg font-extrabold">{session?.room ?? "201호 다인실"}</h1>
      </header>

      {/* 위험도 카드 */}
      <section className="px-4 -mt-1">
        <div className="rounded-3xl p-5 text-center shadow-sm" style={{ background: s.bg, border: `1px solid ${s.bd}` }}>
          <p className="text-[12px] font-semibold text-slate-500">현재 공기 매개 감염 위험도</p>
          <div className="text-4xl font-extrabold my-1" style={{ color: s.c }}>{poiPct}<span className="text-xl">%</span></div>
          <p className="text-[12px] font-bold" style={{ color: s.c }}>{s.emoji} {s.st}</p>
          <p className="text-[10.5px] text-slate-400 mt-2">Wells-Riley 재호흡 모델 기준 · 실시간</p>
        </div>
      </section>

      {/* 공기질 4종 */}
      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const bad = m.v != null && m.v >= m.bad;
          const warn = m.v != null && m.v >= m.warn;
          const col = bad ? "#dc2626" : warn ? "#c2410c" : "#15803d";
          return (
            <div key={m.k} className="bg-white dark:bg-[#111827] rounded-2xl p-4">
              <p className="text-[12px] font-semibold text-slate-400">{m.k}</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: m.v == null ? "#94a3b8" : col }}>
                {m.v != null ? Math.round(m.v * 10) / 10 : "—"}
                <span className="text-[12px] font-medium text-slate-400 ml-1">{m.unit}</span>
              </p>
            </div>
          );
        })}
      </section>

      {/* 코웨이 공기등급 */}
      <section className="px-4 mt-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">실내 공기 등급</p>
            <p className="text-[11px] text-slate-400">코웨이 공기청정기 실측</p>
          </div>
          <span className="text-[14px] font-extrabold px-3 py-1.5 rounded-full" style={{ color: GRADE_COLOR[grade], background: `${GRADE_COLOR[grade]}1a` }}>
            {coway?.available ? GRADE[grade] : "연결 확인 중"}
          </span>
        </div>
      </section>

      <p className="px-6 mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
        수치가 기준을 넘으면 병원이 <b>자동으로</b> 환기·청정 강도를 높입니다. 보호자가 따로 하실 일은 없습니다.
      </p>
    </div>
  );
}
