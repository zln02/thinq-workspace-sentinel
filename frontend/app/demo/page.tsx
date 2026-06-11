// frontend/app/demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Wind, Thermometer, Droplets, Activity, HeartPulse, Bell, PlayCircle, Play, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// 💡 4단계 시나리오에 맞춘 데이터 변화
const SCENARIO_DATA = {
  1: { tier: "MONITOR", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", status: "안정", bt: 36.5, hr: 72, co2: 605, temp: 23.5, rh: 45, pm25: 10 },
  2: { tier: "CRITICAL", color: "text-red-500", bg: "bg-red-600/30", border: "border-red-600/70", status: "고열/위험", bt: 38.8, hr: 115, co2: 1850, temp: 27.5, rh: 65, pm25: 55 },
  3: { tier: "HIGH_RISK", color: "text-[#A50034]", bg: "bg-[#A50034]/20", border: "border-[#A50034]/60", status: "제어 중", bt: 37.5, hr: 90, co2: 1100, temp: 22.0, rh: 50, pm25: 25 },
  4: { tier: "MONITOR", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", status: "상황 종료", bt: 36.6, hr: 75, co2: 620, temp: 24.0, rh: 48, pm25: 12 },
};

export default function DemoPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showToasts, setShowToasts] = useState(false);

  const data = SCENARIO_DATA[step];

  // 3단계(가전 제어)로 넘어갈 때, 오른쪽 아래에 ThinQ 제어 알림 띄우기
  useEffect(() => {
    if (step === 3) {
      setShowToasts(true);
      setTimeout(() => setShowToasts(false), 5000); // 5초 뒤 알림 사라짐
    } else {
      setShowToasts(false);
    }
  }, [step]);

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 font-sans flex flex-col items-center justify-center p-8 relative">
      {/* 💡 헤더 영역 */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#A50034]/20 border border-[#A50034]/50 flex items-center justify-center text-[#A50034]">
          <PlayCircle size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wide text-white">
            ThinQ Space Sentinel <span className="text-[#A50034]">Live Demo</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">75초 프레젠테이션 시연 모드</p>
        </div>
      </div>
      <Link href="/" className="absolute top-8 right-8 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition">메인으로 종료</Link>

      {/* 💡 메인 시연 화면 (크게 확대한 202호 병실 카드) */}
      <div className={`w-full max-w-2xl rounded-3xl p-8 border-[3px] transition-all duration-700 ${data.border} ${data.bg} backdrop-blur-md shadow-2xl relative overflow-hidden`}>
        {step === 2 && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>}
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">202호 <span className="text-2xl font-bold text-slate-400 ml-2">박점순 어르신 (85세)</span></h2>
          </div>
          <div className={`px-4 py-2 rounded-xl text-lg font-black uppercase ${data.color} bg-[#0B1120]/80 shadow-lg flex items-center gap-2 border border-slate-700/50 transition-colors duration-500`}>
            {step !== 1 && step !== 4 && <AlertCircleIcon />}
            {data.tier}
          </div>
        </div>

        {/* 생체 데이터 */}
        <div className="bg-[#0B1120]/60 rounded-2xl p-6 mb-6 border border-slate-700/50 relative z-10">
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2"><HeartPulse size={18} className={step === 2 ? "text-red-500 animate-bounce" : "text-[#A50034]"}/> 실시간 생체 데이터</h3>
          <div className="grid grid-cols-3 divide-x divide-slate-700/50 text-center">
            <div>
              <p className="text-sm text-slate-400 mb-1">체온</p>
              <p className={`text-4xl font-black transition-colors duration-700 ${step === 2 ? 'text-red-500' : 'text-white'}`}>{data.bt}<span className="text-lg font-normal ml-1">°C</span></p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">심박수</p>
              <p className={`text-4xl font-black transition-colors duration-700 ${step === 2 ? 'text-red-500' : 'text-white'}`}>{data.hr}<span className="text-lg font-normal ml-1">bpm</span></p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">상태</p>
              <p className={`text-3xl font-black mt-1 ${step === 2 ? 'text-red-500' : 'text-green-400'}`}>{data.status}</p>
            </div>
          </div>
        </div>

        {/* 환경 데이터 */}
        <div className="grid grid-cols-4 gap-4 relative z-10">
          <StatBox icon={<Wind />} label="CO2" value={data.co2} unit="ppm" isDanger={data.co2 > 1000} />
          <StatBox icon={<Thermometer />} label="온도" value={data.temp} unit="°C" isDanger={data.temp > 26} />
          <StatBox icon={<Droplets />} label="습도" value={data.rh} unit="%" isDanger={data.rh > 60} />
          <StatBox icon={<Activity />} label="미세먼지" value={data.pm25} unit="μg" isDanger={data.pm25 > 30} />
        </div>
      </div>

      {/* 💡 발표자용 시연 컨트롤러 (하단 고정) */}
      <div className="fixed bottom-10 bg-[#111827] border border-slate-800 p-3 rounded-2xl shadow-2xl flex gap-3 z-50">
        <DemoButton num={1} label="평상시" isActive={step === 1} onClick={() => setStep(1)} />
        <DemoButton num={2} label="위기 발생 (고열)" isActive={step === 2} onClick={() => setStep(2)} color="hover:bg-red-900/50 hover:text-red-400 border-red-900/50" />
        <DemoButton num={3} label="ThinQ 자동 제어" isActive={step === 3} onClick={() => setStep(3)} color="hover:bg-blue-900/50 hover:text-blue-400 border-blue-900/50" />
        <DemoButton num={4} label="상황 종료" isActive={step === 4} onClick={() => setStep(4)} color="hover:bg-green-900/50 hover:text-green-400 border-green-900/50" />
      </div>

      {/* 💡 3단계에서 나타나는 ThinQ 가전 제어 토스트 알림 (우측 하단) */}
      {showToasts && (
        <div className="fixed bottom-32 right-10 flex flex-col gap-3 z-50 animate-in slide-in-from-right-8 duration-500">
          <Toast icon={<Thermometer size={20}/>} title="에어컨 자동 제어" desc="202호 냉방 22도 가동 (체온 하강 유도)" color="bg-blue-500" />
          <Toast icon={<Wind size={20}/>} title="환기기 자동 제어" desc="202호 CO2 배출을 위해 터보 환기 가동" color="bg-teal-500" />
          <Toast icon={<Bell size={20}/>} title="가족 알림 발송" desc="보호자(가족 앱)에게 상황 및 대처 내용 전송" color="bg-purple-500" />
        </div>
      )}
    </main>
  );
}

// 하위 UI 컴포넌트들
function StatBox({ icon, label, value, unit, isDanger }: any) {
  return (
    <div className={`bg-[#0B1120]/60 p-4 rounded-xl border transition-colors duration-700 ${isDanger ? 'border-red-500/50' : 'border-slate-700/50'}`}>
      <div className={`flex items-center gap-1.5 mb-2 ${isDanger ? 'text-red-400' : 'text-slate-400'}`}>
        {React.cloneElement(icon, { size: 16 })}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div className={`text-2xl font-black ${isDanger ? 'text-red-500' : 'text-slate-200'}`}>
        {value}<span className="text-xs font-normal ml-0.5 text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function DemoButton({ num, label, isActive, onClick, color = "hover:bg-slate-800" }: any) {
  return (
    <button onClick={onClick} className={`px-5 py-3 rounded-xl flex items-center gap-3 font-bold transition-all duration-300 border ${isActive ? 'bg-[#A50034] text-white border-[#A50034] shadow-[0_0_15px_rgba(165,0,52,0.5)] scale-105' : `bg-transparent text-slate-400 border-transparent ${color}`}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-white text-[#A50034]' : 'bg-slate-800 text-slate-400'}`}>{num}</span>
      {label}
    </button>
  );
}

function Toast({ icon, title, desc, color }: any) {
  return (
    <div className="bg-[#111827] border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-start gap-4 w-80">
      <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

const AlertCircleIcon = () => (
  <span className="relative flex h-3 w-3 mr-1">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
  </span>
);

import React from 'react'; // StatBox의 cloneElement를 위해 필요