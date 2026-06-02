import TierBadge from "@/components/domain/TierBadge";

export default function ExecutivePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-[#A50034]">Sentinel</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">시설장 대시보드</span>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge tier="t1" />
          <span className="text-sm text-gray-500">🔔 3</span>
          <span className="text-sm text-gray-500">👤 김원장</span>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* KPI 3종 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <p className="text-sm text-gray-500">선제 리드타임</p>
            <p className="text-3xl font-bold text-[#A50034] mt-1">4.2주</p>
            <p className="text-xs text-gray-400 mt-1">지역 UIS 기준</p>
          </div>
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <p className="text-sm text-gray-500">증빙 자동화율</p>
            <p className="text-3xl font-bold text-[#A50034] mt-1">100%</p>
            <p className="text-xs text-gray-400 mt-1">지난 30일</p>
          </div>
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <p className="text-sm text-gray-500">감염관리수가</p>
            <p className="text-3xl font-bold text-green-600 mt-1">✓ 충족</p>
            <p className="text-xs text-gray-400 mt-1">이번 분기</p>
          </div>
        </div>

        {/* 이번 달 자동 대응 요약 */}
        <div className="bg-white rounded-xl p-5 border shadow-sm mb-6">
          <h2 className="font-bold text-lg mb-3">이번 달 자동 대응 요약</h2>
          <div className="flex gap-6 text-sm text-gray-600 mb-4">
            <span>자동 환기 <strong>432회</strong></span>
            <span>UV 가동 <strong>86회</strong></span>
            <span>알림 <strong>12건</strong></span>
          </div>
          <button className="bg-[#A50034] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#7B0027] transition">
            📄 감염관리 증빙 PDF 다운로드
          </button>
        </div>

        {/* UIS 외부 신호 */}
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <h2 className="font-bold text-lg mb-3">UIS 외부 신호 타임라인</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-24 text-gray-500">💊 OTC</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-[#A50034] h-3 rounded-full" style={{ width: "75%" }} />
              </div>
              <span className="text-red-500 font-bold">↑ 상승</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-gray-500">🧪 KOWAS</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-orange-400 h-3 rounded-full" style={{ width: "55%" }} />
              </div>
              <span className="text-orange-500 font-bold">↑ 상승</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-gray-500">🔍 검색</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-yellow-400 h-3 rounded-full" style={{ width: "40%" }} />
              </div>
              <span className="text-yellow-600 font-bold">↑ 상승</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}