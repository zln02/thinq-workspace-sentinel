"use client";
// 알림 이력 — tier 전환 이벤트(localStorage 누적) 시간순
import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, ChevronRight } from "lucide-react";
import { getAlerts, tierState, relTime, type AlertItem } from "@/lib/guardian";
import { PageHeader, Card } from "@/components/guardian/ui";

export default function AlertsPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  useEffect(() => {
    setItems(getAlerts());
    const t = setInterval(() => setItems(getAlerts()), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col pb-6">
      <PageHeader subtitle="알림 이력" title="병동 안전 알림" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-care-ink-3">
          <span className="w-16 h-16 rounded-3xl bg-care-card flex items-center justify-center" style={{ boxShadow: "var(--care-shadow)" }}>
            <BellOff size={30} className="text-care-ink-3" />
          </span>
          <p className="text-[15px] font-bold text-care-ink-2 mt-1">아직 받은 알림이 없습니다</p>
          <p className="text-[13px] text-center">병동 상태가 바뀌면 이곳에 자동으로 기록됩니다.</p>
          <Link href="/guardian/home" className="mt-3 text-[14px] font-bold text-care-red flex items-center gap-1">
            지금 병동 상태 보기 <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <ul className="px-4 mt-4 flex flex-col gap-2.5">
            {items.map((a, i) => {
              const s = tierState(a.tier);
              return (
                <Card key={i} className="p-4 flex gap-3" style={{ borderLeft: `4px solid ${s.c}` }}>
                  <span className="text-2xl">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <b className="text-[15px] font-extrabold" style={{ color: s.c }}>{s.st}</b>
                      <span className="text-[12px] text-care-ink-3">{relTime(a.ts)}</span>
                    </div>
                    <p className="text-[13.5px] text-care-ink-2 mt-0.5 leading-snug">{a.msg}</p>
                  </div>
                </Card>
              );
            })}
          </ul>
          <p className="text-center text-[12px] text-care-ink-3 mt-4">최근 50건까지 표시됩니다</p>
        </>
      )}
    </div>
  );
}
