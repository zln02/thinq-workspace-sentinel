import TierBadge from "./TierBadge";

type Tier = "t1" | "t2" | "t3" | "t4" | "t5";

export interface AlertToastProps {
  tier: Tier;
  roomId: string;
  message: string;
  time: string;
}

export default function AlertToast({ tier, roomId, message, time }: AlertToastProps) {
  return (
    <div className="flex items-start gap-3 bg-white border rounded-xl p-4 shadow-sm">
      <TierBadge tier={tier} />
      <div className="flex-1">
        <div className="font-bold text-sm">{roomId}호</div>
        <div className="text-xs text-gray-600 mt-0.5">{message}</div>
      </div>
      <div className="text-xs text-gray-400">{time}</div>
    </div>
  );
}