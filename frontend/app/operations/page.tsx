// frontend/app/operations/page.tsx
"use client";

import { ActivitySquare, Filter, Download, Search, AlertCircle, CheckCircle, Clock } from "lucide-react";

const LOGS = [
  { time: "10:45:12", event: "가전 제어", detail: "302호 환기기 터보 모드 자동 가동", status: "성공", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { time: "10:30:00", event: "위험 감지", detail: "202호 CO2 농도 1450ppm 초과 감지", status: "경고", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { time: "09:15:30", event: "시스템", detail: "ThinQ AI 주간 감염 예측 모델 업데이트 완료", status: "성공", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { time: "08:00:10", event: "가전 제어", detail: "104호 공기청정기 스마트루버 회전 가동", status: "성공", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { time: "07:45:00", event: "스케줄", detail: "전체 병동 아침 기상 모드 (조명/온도 조절)", status: "완료", badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
];

export default function OperationsPage() {
  return (
    <main className="p-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/50 flex items-center justify-center text-blue-600 dark:text-blue-500">
            <ActivitySquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">시스템 운영 로그</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ThinQ 가전 제어 및 AI 예측 상세 내역</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-lg-red text-white rounded-lg text-sm font-bold shadow-lg shadow-lg-red/30 hover:bg-red-700 transition">
          <Download size={16} /> 리포트 추출
        </button>
      </header>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400"><CheckCircle size={24}/></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">금일 자동 제어 성공</p><p className="text-2xl font-black text-slate-800 dark:text-white">124<span className="text-sm font-normal ml-1 text-slate-500">건</span></p></div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400"><AlertCircle size={24}/></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">실시간 위험 감지</p><p className="text-2xl font-black text-slate-800 dark:text-white">3<span className="text-sm font-normal ml-1 text-slate-500">건</span></p></div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400"><Clock size={24}/></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">시스템 가동 시간</p><p className="text-2xl font-black text-slate-800 dark:text-white">99.9<span className="text-sm font-normal ml-1 text-slate-500">%</span></p></div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="로그 내용, 병실 호수 검색..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-lg-red/50" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <Filter size={16} /> 이벤트 필터
        </button>
      </div>

      {/* 로그 테이블 */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#1F2937] text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 font-semibold w-32">시간</th>
              <th className="p-4 font-semibold w-40">이벤트 유형</th>
              <th className="p-4 font-semibold">상세 내용</th>
              <th className="p-4 font-semibold w-24">상태</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((log, idx) => (
              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-sm">
                <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{log.time}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${log.badge}`}>{log.event}</span></td>
                <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">{log.detail}</td>
                <td className={`p-4 font-bold ${log.status === "경고" ? "text-lg-red" : "text-green-500"}`}>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}