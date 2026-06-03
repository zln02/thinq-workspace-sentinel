// frontend/components/domain/RoomCard.tsx
"use client";
import { Users, Wind, Thermometer, Droplets, Activity } from "lucide-react";

type TierType = "MONITOR" | "CAUTION" | "ALERT" | "HIGH_RISK" | "CRITICAL";

const THEME_MAP: Record<TierType, { border: string; bg: string; text: string; label: string }> = {
  MONITOR: { border: "border-green-500/30", bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400", label: "Monitor" },
  CAUTION: { border: "border-yellow-500/40", bg: "bg-yellow-50 dark:bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", label: "Caution" },
  ALERT: { border: "border-orange-500/50", bg: "bg-orange-50 dark:bg-orange-500/15", text: "text-orange-600 dark:text-orange-400", label: "Alert" },
  HIGH_RISK: { border: "border-red-300 dark:border-[#A50034]/60", bg: "bg-red-50 dark:bg-[#A50034]/20", text: "text-[#A50034]", label: "High Risk" },
  CRITICAL: { border: "border-red-500 dark:border-red-600/70", bg: "bg-red-100 dark:bg-red-600/30", text: "text-red-700 dark:text-red-500", label: "Critical" }
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
    <div onClick={onClick} className={`cursor-pointer rounded-2xl p-5 border ${theme.border} ${theme.bg} backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[160px]`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{roomCode}호</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
            <Users size={12}/> 재실 {occ}/{capacity}명
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${theme.text} bg-white/60 dark:bg-[#0B1120]/80 shadow-sm dark:shadow-inner flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/50`}>
          <span className="relative flex h-1.5 w-1.5">
            {tier !== "MONITOR" && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.text} opacity-50`}></span>}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 currentColor`}></span>
          </span>
          {theme.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Wind size={12}/> CO₂</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{co2}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Activity size={12}/> PM2.5</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{pm25}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Thermometer size={12}/> 온도</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{temp}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Droplets size={12}/> 습도</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{rh}%</span>
        </div>
      </div>
    </div>
  );
}