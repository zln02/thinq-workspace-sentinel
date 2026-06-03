// frontend/app/executive/page.tsx
"use client";

import { Building2, TrendingDown, FileCheck2, Lightbulb, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const costData = [
  { name: '1주차', 수동방역비용: 120, ThinQ자동제어: 45 },
  { name: '2주차', 수동방역비용: 130, ThinQ자동제어: 48 },
  { name: '3주차', 수동방역비용: 110, ThinQ자동제어: 42 },
  { name: '4주차', 수동방역비용: 140, ThinQ자동제어: 50 },
];

export default function ExecutiveDashboard() {
  return (
    <main className="p-8 animate-in fade-in duration-500 space-y-8">
      <header className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/50 flex items-center justify-center text-teal-600 dark:text-teal-500">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">시설장(경영) 대시보드</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">병원 전체 ROI 및 질병관리청 법적 컴플라이언스 현황</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-lg-red text-white rounded-lg text-sm font-bold shadow-md hover:bg-red-700 transition">
          <FileCheck2 size={16} /> 질병청 증빙 리포트 출력
        </button>
      </header>

      {/* 경영 성과 KPI */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold">월간 에너지 절감액</h3>
            <TrendingDown className="text-green-500" />
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">₩ 1,240,000</div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">전년 동월 대비 24% 절감 (에어컨/공기청정기 최적화)</p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold">인건비 (수동 방역 대비)</h3>
            <TrendingDown className="text-green-500" />
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">120 <span className="text-xl text-slate-400 font-medium">시간 절약</span></div>
          <p className="text-sm text-slate-500 mt-2 font-medium">간병 인력의 환경 관리 업무를 ThinQ가 대체</p>
        </div>

        <div className="bg-gradient-to-br from-lg-red to-[#7B0027] rounded-2xl p-6 shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-white/80 font-semibold">법적 컴플라이언스 (질병청)</h3>
            <CheckCircle2 className="text-white" />
          </div>
          <div className="text-4xl font-black">100% 충족</div>
          <p className="text-sm text-white/90 mt-2 font-medium flex items-center gap-1">
            <Lightbulb size={14}/> CO2, 환기량, 온습도 기준치 완벽 달성
          </p>
        </div>
      </div>

      {/* ROI 분석 차트 */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">수동 방역 vs ThinQ 자동 제어 유지비용 비교 (단위: 만원)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="수동방역비용" name="기존 수동 방역 및 관리 비용" fill="#9CA3AF" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="ThinQ자동제어" name="ThinQ 도입 후 최적화 유지비용" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}