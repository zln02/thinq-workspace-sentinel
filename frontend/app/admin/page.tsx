// frontend/app/admin/page.tsx
"use client";

import { useState, useMemo } from "react";
import { ShieldAlert, Users, Activity, Wind, Zap, CheckCircle2, HeartPulse, TrendingUp, BatteryCharging, AlertTriangle, LayoutGrid } from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FloorPlan } from "@/components/domain/FloorPlan";

type PersonaType = "ICN" | "DIRECTOR" | "FM";

const DATA_SETS = {
  ICN: [{ name: '월', risk: 12, count: 2 }, { name: '화', risk: 15, count: 4 }, { name: '수', risk: 28, count: 7 }, { name: '목', risk: 18, count: 3 }, { name: '금', risk: 10, count: 1 }],
  DIRECTOR: [{ name: '월', safetyScore: 92, costSaved: 10 }, { name: '화', safetyScore: 95, costSaved: 12 }, { name: '수', safetyScore: 88, costSaved: 15 }, { name: '목', safetyScore: 94, costSaved: 11 }, { name: '금', safetyScore: 98, costSaved: 18 }],
  FM: [{ name: '월', energy: 420, deviceActive: 45 }, { name: '화', energy: 450, deviceActive: 50 }, { name: '수', energy: 580, deviceActive: 82 }, { name: '목', energy: 490, deviceActive: 60 }, { name: '금', energy: 410, deviceActive: 40 }]
};

export default function AdminDashboard() {
  const [persona, setPersona] = useState<PersonaType>("ICN");

  const content = useMemo(() => {
    switch (persona) {
      case "ICN":
        return {
          greeting: "이정희 간호사님", desc: "현재 병동 내 감염 확산 위험도 및 환자 생체 정보를 관제 중입니다.",
          kpi: [
            { icon: <Users size={20}/>, label: "총 재실 인원", value: "124", unit: "명", color: "text-blue-500 dark:text-blue-400" },
            { icon: <Activity size={20}/>, label: "평균 감염 위험도", value: "14.2", unit: "%", color: "text-green-500 dark:text-green-400" },
            { icon: <AlertTriangle size={20}/>, label: "주의/위험 병실", value: "3", unit: "개소", color: "text-[#A50034]", glow: true },
            { icon: <HeartPulse size={20}/>, label: "생체 이상 감지", value: "2", unit: "명", color: "text-orange-500 dark:text-orange-400" }
          ],
          chartLines: [
            <Bar key="count" yAxisId="right" dataKey="count" name="가전 제어 건수" fill="#3B82F6" radius={[4,4,0,0]} barSize={20} />,
            <Line key="risk" yAxisId="left" type="monotone" dataKey="risk" name="평균 위험도 (%)" stroke="#A50034" strokeWidth={3} />
          ]
        };
      case "DIRECTOR":
        return {
          greeting: "박원장님", desc: "요양병원 전체 운영 효율 및 종합 안전도를 확인하세요.",
          kpi: [
            { icon: <ShieldAlert size={20}/>, label: "종합 안전 점수", value: "98", unit: "점", color: "text-green-500 dark:text-green-400", glow: true },
            { icon: <TrendingUp size={20}/>, label: "방역 비용 절감", value: "12", unit: "%", color: "text-blue-500 dark:text-blue-400" },
            { icon: <CheckCircle2 size={20}/>, label: "가전 자동가동률", value: "99.9", unit: "%", color: "text-teal-500 dark:text-teal-400" },
            { icon: <Users size={20}/>, label: "보호자 안심알림", value: "45", unit: "건", color: "text-purple-500 dark:text-purple-400" }
          ],
          chartLines: [
            <Bar key="cost" yAxisId="right" dataKey="costSaved" name="비용 절감율 (%)" fill="#10B981" radius={[4,4,0,0]} barSize={20} />,
            <Line key="score" yAxisId="left" type="monotone" dataKey="safetyScore" name="안전 점수 (점)" stroke="#3B82F6" strokeWidth={3} />
          ]
        };
      case "FM":
        return {
          greeting: "장혁준 팀장님", desc: "LG ThinQ 가전 연결 상태 및 에너지 사용량을 모니터링합니다.",
          kpi: [
            { icon: <Zap size={20}/>, label: "가전 연결 상태", value: "100", unit: "%", color: "text-green-500 dark:text-green-400" },
            { icon: <BatteryCharging size={20}/>, label: "금일 자동 제어", value: "28", unit: "건", color: "text-blue-500 dark:text-blue-400" },
            { icon: <Wind size={20}/>, label: "필터 교체 알림", value: "2", unit: "대", color: "text-[#A50034]", glow: true },
            { icon: <Activity size={20}/>, label: "일일 전력 사용", value: "450", unit: "kWh", color: "text-orange-500 dark:text-orange-400" }
          ],
          chartLines: [
            <Bar key="device" yAxisId="right" dataKey="deviceActive" name="가동 횟수" fill="#8B5CF6" radius={[4,4,0,0]} barSize={20} />,
            <Line key="energy" yAxisId="left" type="monotone" dataKey="energy" name="에너지 사용량 (kWh)" stroke="#F59E0B" strokeWidth={3} />
          ]
        };
    }
  }, [persona]);

  return (
    <main className="p-8 animate-in fade-in duration-500 space-y-8">
      {/* 💡 배경색 및 텍스트 색상을 라이트/다크 양쪽에 맞게 수정했습니다. */}
      <header className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 flex justify-between items-center shadow-sm dark:shadow-lg transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-[#A50034]/20 border border-red-100 dark:border-[#A50034]/50 flex items-center justify-center text-[#A50034]">
            <ShieldAlert size={22} strokeWidth={2.5} />
          </div>
          <div>
            {/* 💡 요청하신 새로운 타이틀로 변경했습니다. */}
            <h1 className="text-xl font-bold tracking-wide text-slate-900 dark:text-white">
              ThinQ Space <span className="text-[#A50034]">Sentinel</span>
            </h1>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-[#1F2937] p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
          {(["ICN", "DIRECTOR", "FM"] as const).map((p) => (
            <button
              key={p} onClick={() => setPersona(p)}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 ${persona === p ? "bg-[#A50034] text-white shadow-[0_0_12px_rgba(165,0,52,0.4)] dark:shadow-[0_0_12px_rgba(165,0,52,0.6)]" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              {p === "ICN" ? "이정희 (감염관리)" : p === "DIRECTOR" ? "박원장 (시설장)" : "장혁준 (시설관리)"}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-8 flex-1">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{content.greeting}, <span className="font-normal text-slate-500 dark:text-slate-400">안전한 하루입니다.</span></h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{content.desc}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-5">
          {content.kpi.map((item, idx) => (
            <div key={idx} className={`relative overflow-hidden bg-white dark:bg-[#111827] border ${item.glow ? 'border-red-200 dark:border-[#A50034]/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm dark:shadow-lg flex items-center gap-4 transition-all hover:-translate-y-1`}>
              {item.glow && <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#A50034] blur-[50px] opacity-10 dark:opacity-20 rounded-full pointer-events-none"></div>}
              <div className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center ${item.color} border border-slate-100 dark:border-slate-700/50`}>{item.icon}</div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{item.value}</span>
                  <span className="text-sm text-slate-500 font-medium">{item.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg h-[320px] transition-colors">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={DATA_SETS[persona]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              {content.chartLines}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <LayoutGrid className="text-[#A50034]" /> 실시간 병실 및 환자 관제
          </h2>
          <FloorPlan />
        </div>
      </div>
    </main>
  );
}