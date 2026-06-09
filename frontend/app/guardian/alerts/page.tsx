"use client";
// 알림 이력 — tier 전환 이벤트(localStorage 누적) 시간순 표시
import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";
import { getAlerts, tierState, relTime, type AlertItem } from "@/lib/guardian";

export default function AlertsPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  useEffect(() => {
    setItems(getAlerts());
    const t = setInterval(() => setItems(getAlerts()), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col">
      <header className="px-5 pt-12 pb-4 bg-[#A50034] text-white">
        <p className="text-[11px] text-white/70">알림 이력</p>
        <h1 className="text-lg font-extrabold">병동 안전 알림</h1>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
          <BellOff size={36} />
          <p className="text-sm">아직 받은 알림이 없습니다</p>
          <p className="text-[11px]">상태가 바뀌면 여기에 기록됩니다</p>
        </div>
      ) : (
        <ul className="px-4 mt-3 flex flex-col gap-2.5">
          {items.map((a, i) => {
            const s = tierState(a.tier);
            return (
              <li key={i} className="bg-white dark:bg-[#111827] rounded-2xl p-4 flex gap-3" style={{ borderLeft: `4px solid ${s.c}` }}>
                <span className="text-2xl">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <b className="text-[14px] font-extrabold" style={{ color: s.c }}>{s.st}</b>
                    <span className="text-[11px] text-slate-400">{relTime(a.ts)}</span>
                  </div>
                  <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{a.msg}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
