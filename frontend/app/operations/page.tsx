import FloorPlan from "@/components/domain/FloorPlan";
import TierBadge from "@/components/domain/TierBadge";

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
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

      {/* 메인 */}
      <main className="p-6">
        <FloorPlan />
      </main>
    </div>
  );
}