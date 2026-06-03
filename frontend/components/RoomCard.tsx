// frontend/components/domain/RoomCard.tsx
"use client";
import { Users, Wind, Thermometer, Droplets, Activity } from "lucide-react";

export default function RoomCard({ roomCode, capacity, occ, snapshot, onClick }: any) {
  const tier = snapshot?.tier || "MONITOR";
  
  const themeMap: Record<string, any> = {
    MONITOR: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", label: "Monitor" },
    CAUTION: { border: "border-yellow-500/40", bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Caution" },
    ALERT: { border: "border-orange-500/50", bg: "bg-orange-500/15", text: "text-orange-400", label: "Alert" },
    HIGH_RISK: { border: "border-[#A50034]/60", bg: "bg-[#A50034]/20", text: "text-[#A50034]", label: "High Risk" },
    CRITICAL: { border: "border-red-600/70", bg: "bg-red-600/30", text: "text-red-500", label: "Critical" }
  };
  const theme = themeMap[tier as string] || themeMap.MONITOR;

  // 💡 고정값이 아닌 snapshot 데이터를 화면에 반영!
  const poi = snapshot ? (snapshot.poi * 100).toFixed(1) : "—";
  const co2 = snapshot?.co2 || "—";
  const temp = snapshot?.temp_c?.toFixed(1) || "—";
  const rh = snapshot?.rh?.toFixed(0) || "—";
  const pm25 = snapshot?.pm25 || "—";

  return (
    <div onClick={onClick} className={`cursor-pointer rounded-2xl p-5 border ${theme.border} ${theme.bg} backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[160px]`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-bold text-slate-100 tracking-tight">{roomCode}호</h4>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Users size={12}/> 재실 {occ}/{capacity}명
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${theme.text} bg-[#0B1120]/80 shadow-inner flex items-center gap-1.5 border border-slate-700/50`}>
          <span className="relative flex h-1.5 w-1.5">
            {tier !== "MONITOR" && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.bg} opacity-75`}></span>}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 currentColor`}></span>
          </span>
          {theme.label}
        </div>
      </div>
      {/* 센서 데이터 출력 */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 flex items-center gap-1"><Wind size={12}/> CO₂</span>
          <span className="font-bold text-slate-200">{co2} <span className="font-normal text-slate-500">ppm</span></span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 flex items-center gap-1"><Activity size={12}/> PM2.5</span>
          <span className="font-bold text-slate-200">{pm25} <span className="font-normal text-slate-500">μg/m³</span></span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 flex items-center gap-1"><Droplets size={12}/> 습도</span>
          <span className="font-bold text-slate-200">{rh} <span className="font-normal text-slate-500">%</span></span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 flex items-center gap-1"><Thermometer size={12}/> 온도</span>
          <span className="font-bold text-slate-200">{temp} <span className="font-normal text-slate-500">°C</span></span>
        </div>
      </div>
    </div>
  );
}