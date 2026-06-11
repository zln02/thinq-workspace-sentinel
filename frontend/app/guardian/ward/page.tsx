"use client";
// 병동 상세 — 공기질 4종(LG 4색) + 감염 위험도 + 코웨이 공기등급
import { useEffect, useState } from "react";
import { useLiveWard, useCowayStatus } from "@/lib/useSentinel";
import { getSession, tierState, AQ_LABELS, AQ_COLORS, metricColor } from "@/lib/guardian";
import { PageHeader, Card, SectionTitle, ConnectionBanner, Skeleton } from "@/components/guardian/ui";
import type { Tier } from "@/lib/tier";

export default function WardPage() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => setSession(getSession()), []);
  const { data, connected, lastTs } = useLiveWard(session?.space_id ?? "ward_a");
  const coway = useCowayStatus();

  const hasData = data != null;
  const tier = (data?.tier as Tier) ?? "MONITOR";
  const s = tierState(tier);
  const poiPct = data?.poi != null ? (data.poi * 100).toFixed(1) : "—";
  const grade = (coway?.aq_grade as number | undefined) ?? 0;
  const cowayCo2 = coway?.co2 as number | undefined;
  const cowayPm = coway?.pm25 as number | undefined;

  const metrics: { k: string; v: number | null; unit: string; warn: number; bad: number }[] = [
    { k: "이산화탄소", v: data?.co2_ppm ?? cowayCo2 ?? null, unit: "ppm", warn: 1000, bad: 2000 },
    { k: "미세먼지", v: data?.pm25 ?? cowayPm ?? null, unit: "㎍/㎥", warn: 35, bad: 75 },
    { k: "온도", v: data?.temp_c ?? null, unit: "℃", warn: 29, bad: 31 },
    { k: "습도", v: data?.humidity ?? null, unit: "%", warn: 65, bad: 75 },
  ];

  return (
    <div className="flex flex-col pb-6">
      <PageHeader subtitle="병동 상세" title={session?.room ?? "201호 다인실"} />

      <ConnectionBanner connected={connected} lastTs={lastTs} />

      {/* 위험도 카드 */}
      <section className="px-4 mt-4">
        {hasData ? (
          <Card className="p-5 text-center care-enter" style={{ background: s.bg, boxShadow: "none", border: `1px solid ${s.bd}` }}>
            <p className="text-[13px] font-semibold text-care-ink-2">현재 공기로 인한 감염 위험도</p>
            <div className="text-[44px] leading-none font-extrabold mt-2" style={{ color: s.c }}>
              {poiPct}<span className="text-[22px]">%</span>
            </div>
            <p className="text-[14px] font-bold mt-1" style={{ color: s.c }}>{s.emoji} {s.st}</p>
            <p className="text-[12px] text-care-ink-3 mt-2">실내 공기 분석 기준 · 실시간</p>
          </Card>
        ) : (
          <Card className="p-5"><Skeleton className="h-4 w-40 mx-auto" /><Skeleton className="h-12 w-28 mx-auto mt-3" /><Skeleton className="h-4 w-20 mx-auto mt-3" /></Card>
        )}
      </section>

      {/* 공기질 4종 */}
      <section className="px-4 mt-6">
        <SectionTitle>실시간 공기질</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => {
            const col = metricColor(m.v, m.warn, m.bad);
            return (
              <Card key={m.k} className="p-4">
                <p className="text-[14px] font-semibold text-care-ink-2">{m.k}</p>
                <p className="text-3xl font-extrabold mt-1.5" style={{ color: col }}>
                  {m.v != null ? Math.round(m.v * 10) / 10 : "—"}
                  <span className="text-[13px] font-medium text-care-ink-3 ml-1">{m.unit}</span>
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 코웨이 공기등급 */}
      <section className="px-4 mt-6">
        <SectionTitle>실내 공기 등급</SectionTitle>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-care-ink">공기청정기 측정</p>
            <p className="text-[12px] text-care-ink-3 mt-0.5">코웨이 실측 연동</p>
          </div>
          <span className="text-[15px] font-extrabold px-3.5 py-1.5 rounded-full" style={{ color: AQ_COLORS[grade], background: `${AQ_COLORS[grade]}1a` }}>
            {coway?.available ? AQ_LABELS[grade] : "연결 확인 중"}
          </span>
        </Card>
      </section>

      <p className="px-6 mt-6 text-[12px] text-care-ink-3 text-center leading-relaxed">
        수치가 기준을 넘으면 병원이 <b className="text-care-ink-2">자동으로</b> 환기·청정 강도를 높입니다. 보호자가 따로 하실 일은 없습니다.
      </p>
    </div>
  );
}
