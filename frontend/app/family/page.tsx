import TierBadge from "@/components/domain/TierBadge";
import SafetyScore from "@/components/domain/SafetyScore";

export default function FamilyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <p className="text-2xl font-bold text-gray-800">💚 어머니 병실은 지금 안전해요</p>
        <p className="text-gray-500 mt-1">마지막 갱신 1분 전</p>
      </div>

      <SafetyScore score={92} />

      <div className="mt-4">
        <TierBadge tier="t1" />
      </div>

      <div className="mt-6 w-full max-w-sm bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><span>오늘 자동 환기</span><span className="font-bold">6회 ✓</span></div>
        <div className="flex justify-between"><span>공기질</span><span className="font-bold text-green-600">좋음</span></div>
        <div className="flex justify-between"><span>외부 감염 유행</span><span className="font-bold">안정</span></div>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <p className="font-bold mb-2">📅 면회 가이드 (이번 주)</p>
        <ul className="text-sm text-gray-600 list-disc list-inside">
          <li>화/목 14:00~16:00 권장</li>
          <li>마스크 필수</li>
        </ul>
      </div>
    </div>
  );
}