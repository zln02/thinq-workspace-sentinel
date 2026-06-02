import RoomCard, { RoomCardProps } from "./RoomCard";

const ROOMS: RoomCardProps[] = [
  { roomId: "201", tier: "t1", co2: 612,  pm25: 10, rebreathFraction: 0.8, occupancy: 2, isAuto: false },
  { roomId: "202", tier: "t2", co2: 1180, pm25: 22, rebreathFraction: 2.4, occupancy: 3, isAuto: false },
  { roomId: "203", tier: "t3", co2: 1510, pm25: 31, rebreathFraction: 4.1, occupancy: 4, isAuto: true  },
  { roomId: "204", tier: "t1", co2: 620,  pm25: 11, rebreathFraction: 0.9, occupancy: 2, isAuto: false },
  { roomId: "205", tier: "t1", co2: 600,  pm25: 9,  rebreathFraction: 0.7, occupancy: 1, isAuto: false },
  { roomId: "206", tier: "t1", co2: 630,  pm25: 12, rebreathFraction: 1.0, occupancy: 3, isAuto: false },
  { roomId: "207", tier: "t1", co2: 610,  pm25: 10, rebreathFraction: 0.8, occupancy: 2, isAuto: false },
  { roomId: "208", tier: "t4", co2: 1850, pm25: 42, rebreathFraction: 5.8, occupancy: 4, isAuto: true  },
  { roomId: "209", tier: "t1", co2: 605,  pm25: 10, rebreathFraction: 0.8, occupancy: 2, isAuto: false },
  { roomId: "210", tier: "t2", co2: 1100, pm25: 20, rebreathFraction: 2.1, occupancy: 3, isAuto: false },
  { roomId: "211", tier: "t1", co2: 615,  pm25: 11, rebreathFraction: 0.9, occupancy: 2, isAuto: false },
  { roomId: "212", tier: "t1", co2: 608,  pm25: 10, rebreathFraction: 0.8, occupancy: 1, isAuto: false },
];

export default function FloorPlan() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🏥 2층 병실 현황</h2>
      <div className="grid grid-cols-4 gap-3">
        {ROOMS.map((room) => (
          <RoomCard key={room.roomId} {...room} />
        ))}
      </div>
    </div>
  );
}