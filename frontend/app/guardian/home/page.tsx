"use client";
// 안심 홈 — 상태 라벨 우선 + "지금 병원이 하는 일" + 실시간/끊김 처리(P0)
import { useEffect, useState } from "react";
import { Wind, Fan, Eye, Droplets } from "lucide-react";
import { useLiveWard } from "@/lib/useSentinel";
import { getSession, tierState, TIER_RANK } from "@/lib/guardian";
import { PageHeader, Card, SectionTitle, ConnectionBanner, Skeleton } from "@/components/guardian/ui";
import type { Tier } from "@/lib/tier";

export default function HomePage() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => setSession(getSession()), []);
  const { data, connected, lastTs } = useLiveWard(session?.space_id ?? "ward_a");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasData = data != null;
  const tier = (data?.tier as Tier) ?? "MONITOR";
  const s = tierState(tier);
  const rank = TIER_RANK[tier];
  const upd = lastTs && now ? (now - lastTs < 2000 ? "방금" : `${Math.round((now - lastTs) / 1000)}초 전`) : "수신 대기";

  const acts = [
    { icon: Wind, n: "공기청정기", on: rank >= 2 ? "급속 가동" : rank >= 1 ? "자동 가동" : "대기", active: rank >= 1 },
    { icon: Fan, n: "환기 시스템", on: rank >= 2 ? "강화 환기" : rank >= 1 ? "환기 중" : "기본", active: rank >= 1 },
    { icon: Eye, n: "24시간 감시", on: "가동 중", active: true },
    { icon: Droplets, n: "습도 관리", on: rank >= 1 ? "보정 중" : "유지", active: rank >= 1 },
  ];

  return (
    <div className="flex flex-col pb-6">
      <PageHeader
        subtitle="LG 디지털요양병원"
        title="ThinQ 케어"
        right={
          <span className={`flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full ${connected ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
            {connected ? "실시간" : "연결 중"}
          </span>
        }
      />

      <ConnectionBanner connected={connected} lastTs={lastTs} />

      {/* 안심 메인 카드 — 상태 라벨 최우선, 이모지 보조 */}
      <section className="px-4 mt-4">
        {hasData ? (
          <Card className="p-6 text-center care-enter" style={{ background: s.bg, boxShadow: "none", border: `1px solid ${s.bd}` }}>
            <p className="text-[14px] font-semibold text-care-ink-2">
              {session?.patient ?? "어르신"} · {session?.room ?? "병동"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-4xl">{s.emoji}</span>
              <span className="text-4xl font-extrabold tracking-tight" style={{ color: s.c }}>{s.st}</span>
            </div>
            <p className="text-[15px] text-care-ink-2 mt-3 leading-relaxed px-1">{s.msg}</p>
            <p className="text-[12px] text-care-ink-3 mt-4">{upd} 업데이트</p>
          </Card>
        ) : (
          <Card className="p-6">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-10 w-40 mx-auto mt-4" />
            <Skeleton className="h-4 w-56 mx-auto mt-4" />
            <Skeleton className="h-4 w-24 mx-auto mt-4" />
            <p className="text-[12px] text-care-ink-3 text-center mt-4">병동 상태를 불러오는 중…</p>
          </Card>
        )}
      </section>

      {/* 병원 조치 현황 */}
      <section className="px-4 mt-6">
        <SectionTitle>지금 병원이 하는 일</SectionTitle>
        <Card className="overflow-hidden">
          <div className="divide-y divide-[var(--care-line)]">
            {acts.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.n} className="flex items-center gap-3 px-4 py-4">
                  <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${a.active ? "bg-care-red-soft text-care-red" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>
                    <Icon size={19} />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-care-ink">{a.n}</span>
                  <span className={`text-[13px] font-bold px-2.5 py-1 rounded-full ${a.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-care-ink-3"}`}>
                    {a.active ? "● " : ""}{hasData ? a.on : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <p className="px-6 mt-5 text-[12px] text-care-ink-3 text-center leading-relaxed">
        지역 감염 유행을 미리 감지해 공기를 <b className="text-care-ink-2">선제적으로 관리</b>하고, 모든 조치를 자동 기록합니다.
      </p>
    </div>
  );
}
