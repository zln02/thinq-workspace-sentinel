import FloorPlan from "@/components/domain/FloorPlan";
import TierBadge from "@/components/domain/TierBadge";
import ApplianceCard, { ApplianceCardProps } from "@/components/domain/ApplianceCard";
import AlertQueue from "@/components/domain/AlertQueue";
import PersonaSwitcher from "@/components/domain/PersonaSwitcher";

const APPLIANCES: ApplianceCardProps[] = [
  { name: "환기기", icon: "🌬️", state: "AUTO", description: "풍량 MAX", isExecuting: true },
  { name: "공기청정기", icon: "💨", state: "AUTO", description: "강풍 + UV nano", isExecuting: true },
  { name: "에어컨", icon: "❄️", state: "AUTO", description: "절전 모드", isExecuting: false },
  { name: "UV 살균기", icon: "🟣", state: "AUTO", description: "재실 0명 시 ON", isExecuting: true },
  { name: "가습기", icon: "💧", state: "AUTO", description: "습도 40~60% 유지", isExecuting: false },
  { name: "제습기", icon: "🌡️", state: "OFF", description: "습도 정상", isExecuting: false },
  { name: "창문개폐기", icon: "🪟", state: "AUTO", description: "외기질 양호 시 개방", isExecuting: false },
  { name: "로봇청소기", icon: "🤖", state: "AUTO", description: "야간 자동 가동", isExecuting: false },
];

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-[#A50034]">Sentinel</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">운영 콘솔</span>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge tier="t3" />
          <span className="text-sm text-gray-500">Alert 2건</span>
        </div>
      </header>

      {/* 페르소나 switcher */}
      <div className="bg-white border-b px-6 py-3">
        <PersonaSwitcher />
      </div>

      <main className="p-6">
        <FloorPlan />
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">⚡ 가전 자동 제어</h2>
          <div className="grid grid-cols-4 gap-3">
            {APPLIANCES.map((a) => (
              <ApplianceCard key={a.name} {...a} />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <AlertQueue />
        </div>
      </main>
    </div>
  );
}