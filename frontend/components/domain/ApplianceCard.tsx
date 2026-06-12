type ApplianceState = "AUTO" | "MANUAL" | "OFF";

export interface ApplianceCardProps {
  name: string;
  icon: string;
  state: ApplianceState;
  description: string;
  isExecuting?: boolean;
}

const STATE_CONFIG = {
  AUTO: { label: "AUTO", bg: "#E8F5E9", color: "#2E7D32" },
  MANUAL: { label: "수동", bg: "#FFF8E1", color: "#F9A825" },
  OFF: { label: "OFF", bg: "#F5F5F5", color: "#9B9B9B" },
};

export default function ApplianceCard({
  name, icon, state, description, isExecuting,
}: ApplianceCardProps) {
  const { label, bg, color } = STATE_CONFIG[state];

  return (
    <div
      style={{ backgroundColor: bg }}
      className="relative rounded-xl p-4 border hover:shadow-md transition"
    >
      {/* 실행 중 점멸 */}
      {isExecuting && (
        <span className="absolute left-2 top-2 w-2 h-2 rounded-full bg-[#7a0024] animate-pulse" />
      )}

      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-bold text-sm mb-1">{name}</div>
      <div className="text-xs text-gray-500 mb-3">{description}</div>

      <span
        style={{ color, borderColor: color }}
        className="text-xs font-bold border rounded-full px-2 py-0.5"
      >
        {label}
      </span>
    </div>
  );
}