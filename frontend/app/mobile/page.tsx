import SafetyScore from "@/components/domain/SafetyScore";
import TierBadge from "@/components/domain/TierBadge";
import AlertQueue from "@/components/domain/AlertQueue";

export default function MobilePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-bold text-[#A50034] mb-4">📱 모바일 — 요양보호사</h1>

      {/* 안심 점수 */}
      <div className="flex flex-col items-center mb-6">
        <SafetyScore score={78} />
        <div className="mt-3">
          <TierBadge tier="t2" />
        </div>
      </div>

      {/* 내 담당 병실 */}
      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 mb-4">
        <h2 className="font-bold text-sm mb-2">⚠️ 담당 병실 주의</h2>
        <div className="flex justify-between text-sm">
          <span>202호</span><span className="text-yellow-600 font-bold">Caution</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>210호</span><span className="text-yellow-600 font-bold">Caution</span>
        </div>
      </div>

      {/* 알림 큐 */}
      <AlertQueue />
    </div>
  );
}