// frontend/app/admin/kpi/page.tsx
"use client";

import { ShieldAlert, BarChart3, PieChart } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const performanceData = [
  { name: '1주차', 예측정확도: 85, 제어성공률: 92 }, { name: '2주차', 예측정확도: 88, 제어성공률: 94 },
  { name: '3주차', 예측정확도: 92, 제어성공률: 96 }, { name: '4주차', 예측정확도: 95, 제어성공률: 99 },
];

const aiModelData = [
  { subject: '인플루엔자 예측', A: 95, fullMark: 100 }, { subject: 'RSV 예측', A: 88, fullMark: 100 },
  { subject: '노로바이러스 예측', A: 82, fullMark: 100 }, { subject: '온열질환 예측', A: 99, fullMark: 100 },
  { subject: '가전 제어 응답성', A: 100, fullMark: 100 }, { subject: '에너지 효율', A: 85, fullMark: 100 },
];

export default function KpiReportPage() {
  return (
    <main className="p-8 animate-in fade-in duration-500 space-y-8">
      <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-lg bg-lg-light dark:bg-[#A50034]/20 border border-lg-red/30 dark:border-[#A50034]/50 flex items-center justify-center text-lg-red">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">월간 KPI 분석 리포트</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ThinQ AI 예측 모델 및 가전 제어 성능 종합 지표</p>
        </div>
      </header>

      {/* 요약 대시보드 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col items-center justify-center relative overflow-hidden transition-colors">
          <PieChart className="absolute -right-6 -top-6 text-slate-100 dark:text-slate-800/30 w-32 h-32" />
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-2">3주 선행 예측 정확도</h3>
          <div className="text-5xl font-black text-green-500 dark:text-green-400">95.4<span className="text-2xl font-medium text-slate-400 ml-1">%</span></div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-3 bg-green-50 dark:bg-slate-800/50 px-3 py-1 rounded-full font-bold">전월 대비 +2.1% 향상</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-lg-red/30 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-lg-red/20 transition-colors">
          <div className="absolute top-0 right-0 w-full h-full bg-lg-red blur-[80px] opacity-5 dark:opacity-10 pointer-events-none"></div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-2">원내 감염 발생률</h3>
          <div className="text-5xl font-black text-lg-red">0.0<span className="text-2xl font-medium text-slate-400 ml-1">%</span></div>
          <p className="text-xs text-lg-red mt-3 bg-lg-light dark:bg-slate-800/50 px-3 py-1 rounded-full font-bold">질병청 가이드라인 100% 충족</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col items-center justify-center transition-colors">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-2">ThinQ 가전 제어 성공률</h3>
          <div className="text-5xl font-black text-blue-500 dark:text-blue-400">99.9<span className="text-2xl font-medium text-slate-400 ml-1">%</span></div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full font-medium">총 1,420회 자동 제어 완수</p>
        </div>
      </div>

      {/* 두 개의 차트를 나란히 배치 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 라인 차트 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">주차별 AI 성능 트렌드</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A50034" stopOpacity={0.3}/><stop offset="95%" stopColor="#A50034" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorCtrl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="예측정확도" stroke="#A50034" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                <Area type="monotone" dataKey="제어성공률" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCtrl)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 💡 새로 추가된 AI 성능 레이더 차트 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">AI 모델 상세 지표 평가</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={aiModelData}>
                <PolarGrid stroke="#374151" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }} />
                <Radar name="AI 성능" dataKey="A" stroke="#A50034" fill="#A50034" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}