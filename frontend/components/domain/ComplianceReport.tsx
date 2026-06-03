"use client";
import { useState } from "react";

export default function ComplianceReport() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleDownload() {
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    }, 2000);
  }

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-1">📄 감염관리 증빙 리포트</h3>
      <p className="text-xs text-gray-500 mb-4">질병청 점검 양식 자동 생성</p>

      <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between"><span>자동 환기 횟수</span><span className="font-bold">432회</span></div>
        <div className="flex justify-between"><span>UV 가동 횟수</span><span className="font-bold">86회</span></div>
        <div className="flex justify-between"><span>알림 발송</span><span className="font-bold">12건</span></div>
        <div className="flex justify-between"><span>기간</span><span className="font-bold">2026.05.01 ~ 05.31</span></div>
      </div>

      {/* 진행률 바 */}
      {loading && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div className="bg-[#A50034] h-2 rounded-full animate-pulse w-3/4" />
        </div>
      )}

      {/* 완료 토스트 */}
      {done && (
        <div className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-2 rounded-lg mb-3">
          ✅ 증빙 PDF 생성 완료!
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full bg-[#A50034] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#7B0027] transition disabled:opacity-50"
      >
        {loading ? "생성 중..." : "📄 감염관리 증빙 PDF 다운로드"}
      </button>
    </div>
  );
}