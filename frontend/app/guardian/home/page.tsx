"use client";
// 안심 홈 — tier 안심카드 + "지금 병원이 하는 일"(가전 가동현황) + 실시간 연결
import { useEffect, useState } from "react";
import { Wind, Fan, Eye, Droplets } from "lucide-react";
import { useLiveWard } from "@/lib/useSentinel";
import { getSession, tierState, TIER_RANK } from "@/lib/guardian";
import type { Tier } from "@/lib/tier";

export default function HomePage() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => setSession(getSession()), []);
  const { data, connected } = useLiveWard(session?.space_id ?? "ward_a");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const [lastTs, setLastTs] = useState<number | null>(null);
  useEffect(() => {
    if (data) setLastTs(Date.now());
  }, [data]);

  const tier = (data?.tier as Tier) ?? "MONITOR";
  const s = tierState(tier);
  const rank = TIER_RANK[tier];
  const upd = lastTs ? (now - lastTs < 2000 ? "방금" : `${Math.round((now - lastTs) / 1000)}초 전`) : "수신 대기";

  // 병원 조치 현황 (tier 기반)
  const acts = [
    { icon: Wind, n: "공기청정기", on: rank >= 2 ? "급속 가동" : rank >= 1 ? "자동 가동" : "대기", active: rank >= 1 },
    { icon: Fan, n: "환기 시스템", on: rank >= 2 ? "강화 환기" : rank >= 1 ? "환기 중" : "기본", active: rank >= 1 },
    { icon: Eye, n: "24시간 감시", on: "가동 중", active: true },
    { icon: Droplets, n: "습도 관리", on: rank >= 1 ? "보정 중" : "유지", active: rank >= 1 },
  ];

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-[#A50034] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/70">LG 디지털요양병원</p>
            <h1 className="text-lg font-extrabold">LG ThinQ 케어</h1>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${connected ? "bg-white/20" : "bg-black/20"}`}>
            {connected ? "● 실시간 연결" : "○ 연결 중"}
          </span>
        </div>
      </header>

      {/* 안심 메인 카드 */}
      <section className="px-4 -mt-1">
        <div className="rounded-3xl p-6 text-center shadow-sm" style={{ background: s.bg, border: `1px solid ${s.bd}` }}>
          <p className="text-[13px] font-semibold text-slate-600">
            {session?.patient ?? "어르신"} · {session?.room ?? "병동"}
          </p>
          <div className="text-6xl my-3">{s.emoji}</div>
          <div className="text-3xl font-extrabold" style={{ color: s.c }}>{s.st}</div>
          <p className="text-[13px] text-slate-600 mt-3 leading-relaxed px-2">{s.msg}</p>
          <p className="text-[11px] text-slate-400 mt-4">{upd} 업데이트</p>
        </div>
      </section>

      {/* 병원 조치 현황 */}
      <section className="px-4 mt-5">
        <h2 className="text-[13px] font-bold text-slate-500 mb-2 ml-1">지금 병원이 하는 일</h2>
        <div className="bg-white dark:bg-[#111827] rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
          {acts.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.n} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.active ? "bg-[#A50034]/10 text-[#A50034]" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                  <Icon size={18} />
                </span>
                <span className="flex-1 text-[14px] font-semibold text-slate-700 dark:text-slate-200">{a.n}</span>
                <span className={`text-[12px] font-extrabold px-2.5 py-1 rounded-full ${a.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "text-slate-400"}`}>
                  {a.active ? "🟢 " : ""}{a.on}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="px-6 mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
        지역 감염 유행을 미리 감지해 공기를 <b>선제적으로 관리</b>하고, 모든 조치를 자동 기록합니다.
      </p>
    </div>
  );
}
