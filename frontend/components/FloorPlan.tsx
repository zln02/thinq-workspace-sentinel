"use client";
import { RoomCard } from "./RoomCard";
import type { Snapshot } from "@/lib/tier";

// 시연용 가상 1층 9병실 배치
const ROOMS = [
  { code: "601", capacity: 6, scenario: "summer_norovirus" as const },
  { code: "602", capacity: 4, scenario: "winter_influenza" as const },
  { code: "603", capacity: 2, scenario: "autumn_covid" as const },
  { code: "604", capacity: 6, scenario: "spring_tb" as const },
  { code: "605", capacity: 4, scenario: "heatwave_norovirus_double" as const },
  { code: "606", capacity: 6, scenario: undefined },
  { code: "607", capacity: 2, scenario: undefined },
  { code: "608", capacity: 4, scenario: undefined },
  { code: "609", capacity: 6, scenario: undefined },
];

interface Props {
  snapshots: Record<string, Snapshot | undefined>;
  onRoomClick?: (roomCode: string) => void;
}

export function FloorPlan({ snapshots, onRoomClick }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-3 border text-sm text-slate-600">
        🏥 LG 디지털요양병원 (시연) · 6층 6병동 · 9개 병실 · 입소자 40명
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ROOMS.map((r) => (
          <RoomCard
            key={r.code}
            roomCode={r.code}
            capacity={r.capacity}
            snapshot={snapshots[r.code]}
            onClick={() => onRoomClick?.(r.code)}
          />
        ))}
      </div>
    </div>
  );
}

export const DEMO_ROOMS = ROOMS;
