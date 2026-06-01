"use client";
import { TIER_META, type Snapshot, type Tier } from "@/lib/tier";

interface Props {
  roomCode: string;
  capacity: number;
  snapshot?: Snapshot;
  onClick?: () => void;
}

export function RoomCard({ roomCode, capacity, snapshot, onClick }: Props) {
  const tier: Tier = snapshot?.tier ?? "MONITOR";
  const meta = TIER_META[tier];
  const poi = snapshot ? (snapshot.poi * 100).toFixed(1) : "—";
  const occ = snapshot?.occupancy ?? 0;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-slate-800">{roomCode}호</div>
          <div className="text-xs text-slate-500">{capacity}인실 · 재실 {occ}/{capacity}</div>
        </div>
        <span className={`${meta.bg} ${meta.text} px-2 py-1 rounded-md text-xs font-bold`}>
          {meta.emoji} {meta.label}
        </span>
      </div>

      <div className="text-2xl font-extrabold text-slate-900">
        PoI <span className="text-lg-primary">{poi}%</span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 mt-2">
        <div>CO₂ {snapshot?.co2 ?? "—"} ppm</div>
        <div>RH {snapshot?.rh.toFixed(0) ?? "—"}%</div>
        <div>온도 {snapshot?.temp_c.toFixed(1) ?? "—"}°C</div>
        <div>ACH {snapshot?.fresh_air_ach.toFixed(1) ?? "—"}</div>
      </div>

      {snapshot && snapshot.infected_count > 0 && (
        <div className="mt-2 text-xs font-bold text-red-600">
          ▲ {snapshot.pathogen} 의심 {snapshot.infected_count}명
        </div>
      )}
    </button>
  );
}
