// frontend/components/domain/FloorPlan.tsx
"use client";
import RoomCard from "./RoomCard";

// 💡 12개 병실의 고유 번호와 각기 다른 실시간 위험도/센서 데이터 (다양하게 섞음)
const ROOM_DATA = [
  { roomCode: "101", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.12, co2: 605, temp_c: 23.5, rh: 45, pm25: 10 } },
  { roomCode: "102", capacity: 4, occ: 3, snapshot: { tier: "CAUTION", poi: 0.35, co2: 850, temp_c: 24.1, rh: 48, pm25: 15 } },
  { roomCode: "103", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.15, co2: 620, temp_c: 23.2, rh: 44, pm25: 12 } },
  { roomCode: "104", capacity: 2, occ: 2, snapshot: { tier: "ALERT", poi: 0.68, co2: 1200, temp_c: 25.2, rh: 55, pm25: 25 } },
  { roomCode: "201", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.18, co2: 650, temp_c: 23.6, rh: 46, pm25: 11 } },
  { roomCode: "202", capacity: 4, occ: 4, snapshot: { tier: "HIGH_RISK", poi: 0.85, co2: 1450, temp_c: 26.1, rh: 60, pm25: 38 } },
  { roomCode: "203", capacity: 4, occ: 1, snapshot: { tier: "MONITOR", poi: 0.05, co2: 450, temp_c: 22.5, rh: 40, pm25: 8 } },
  { roomCode: "204", capacity: 2, occ: 2, snapshot: { tier: "CAUTION", poi: 0.42, co2: 920, temp_c: 24.5, rh: 50, pm25: 18 } },
  { roomCode: "301", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.22, co2: 700, temp_c: 23.8, rh: 47, pm25: 14 } },
  { roomCode: "302", capacity: 4, occ: 4, snapshot: { tier: "CRITICAL", poi: 0.95, co2: 1800, temp_c: 27.5, rh: 65, pm25: 55 } },
  { roomCode: "303", capacity: 4, occ: 3, snapshot: { tier: "ALERT", poi: 0.72, co2: 1300, temp_c: 25.5, rh: 58, pm25: 28 } },
  { roomCode: "304", capacity: 2, occ: 2, snapshot: { tier: "MONITOR", poi: 0.14, co2: 610, temp_c: 23.4, rh: 45, pm25: 10 } },
];

export default function FloorPlan() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {ROOM_DATA.map((room, idx) => (
        <RoomCard 
          key={idx} 
          roomCode={room.roomCode} 
          capacity={room.capacity} 
          occ={room.occ}
          snapshot={room.snapshot}
          onClick={() => console.log(`${room.roomCode} 클릭됨`)}
        />
      ))}
    </div>
  );
}