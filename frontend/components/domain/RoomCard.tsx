// frontend/components/domain/RoomCard.tsx
"use client";
import { Users, Wind, Thermometer, Droplets, Activity } from "lucide-react";

type TierType = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

// 라이트 관제맵: 흰 카드 + 명확한 보더 + tier 색 왼쪽 액센트(border-l-4).
// 위험 단계(HIGH_RISK/CRITICAL)는 배경 틴트로 한눈에 띄게.
const THEME_MAP: Record<TierType, { accent: string; cardBg: string; dot: string; badge: string; label: string }> = {
  MONITOR:   { accent: "border-l-emerald-400", cardBg: "bg-white",    dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "Monitor" },
  CAUTION:   { accent: "border-l-amber-400",   cardBg: "bg-white",    dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700",   label: "Caution" },
  ALERT:     { accent: "border-l-orange-500",  cardBg: "bg-orange-50/60", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700", label: "Alert" },
  HIGH_RISK: { accent: "border-l-[#7a0024]",   cardBg: "bg-red-50",   dot: "bg-[#7a0024]",   badge: "bg-red-100 text-[#7a0024]",    label: "High Risk" },
  CRITICAL:  { accent: "border-l-red-600",     cardBg: "bg-red-100/70", dot: "bg-red-600",   badge: "bg-red-600 text-white",        label: "Critical" },
};

export function RoomCard({ roomCode, capacity, occ, snapshot, onClick }: any) {
  const rawTier = snapshot?.tier || "MONITOR";
  const tier: TierType = rawTier in THEME_MAP ? rawTier : "MONITOR";
  const theme = THEME_MAP[tier];

  const co2 = snapshot?.co2 || "—";
  const temp = snapshot?.temp_c?.toFixed(1) || "—";
  const rh = snapshot?.rh?.toFixed(0) || "—";
  const pm25 = snapshot?.pm25 || "—";

  return (
    <div onClick={onClick} className={`cursor-pointer rounded-2xl p-5 border border-[#D6E2EF] border-l-4 ${theme.accent} ${theme.cardBg} shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[160px]`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-bold text-slate-900 tracking-tight">{roomCode}</h4>
          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
            <Users size={12}/> 재실 {occ ?? "—"}/{capacity}명
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${theme.badge} shadow-sm flex items-center gap-1.5`}>
          <span className="relative flex h-1.5 w-1.5">
            {tier !== "MONITOR" && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.dot} opacity-60`}></span>}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${theme.dot}`}></span>
          </span>
          {theme.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1"><Wind size={12}/> CO₂</span>
          <span className="font-bold text-slate-800">{co2}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1"><Activity size={12}/> PM2.5</span>
          <span className="font-bold text-slate-800">{pm25}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1"><Thermometer size={12}/> 온도</span>
          <span className="font-bold text-slate-800">{temp}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1"><Droplets size={12}/> 습도</span>
          <span className="font-bold text-slate-800">{rh}%</span>
        </div>
      </div>
    </div>
  );
}
