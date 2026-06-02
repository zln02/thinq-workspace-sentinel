import TierBadge from "./TierBadge";

type Tier = "t1" | "t2" | "t3" | "t4" | "t5";

export interface RoomCardProps {
  roomId: string;
  tier: Tier;
  co2: number;
  pm25: number;
  rebreathFraction: number;
  occupancy: number;
  isAuto: boolean;
  onClick?: () => void;
}

const TIER_BG = {
  t1: "#E8F5E9",
  t2: "#FFF8E1",
  t3: "#FFF3E0",
  t4: "#FFEBEE",
  t5: "#424242",
};

export default function RoomCard({
  roomId, tier, co2, pm25, rebreathFraction, occupancy, isAuto, onClick,
}: RoomCardProps) {
  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: TIER_BG[tier] }}
      className="relative rounded-xl p-4 border cursor-pointer hover:shadow-md transition"
    >
      {/* 자동대응 점멸 도트 */}
      {isAuto && (
        <span className="absolute left-2 top-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}

      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg">{roomId}호</span>
        <TierBadge tier={tier} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div>CO₂ <span className="font-mono font-bold">{co2} ppm</span></div>
        <div>PM2.5 <span className="font-mono font-bold">{pm25} μg/m³</span></div>
        <div>재호흡률 <span className="font-mono font-bold">{rebreathFraction}%</span></div>
        <div>재실 <span className="font-mono font-bold">{occupancy}명</span></div>
      </div>

      {isAuto && (
        <div className="mt-2 text-xs text-red-500 font-semibold">⚡ 자동 대응 진행 중</div>
      )}
    </div>
  );
}