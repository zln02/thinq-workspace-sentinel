// frontend/app/family/page.tsx
"use client";

import Link from "next/link";
import { Home, Heart, Activity, Wind, Bell, ShieldAlert, Thermometer, HeartPulse, AlertCircle } from "lucide-react";

export default function FamilyPage() {
  // 💡 위험도가 높은 202호 박점순 어르신 데이터를 예시로 사용
  const mockPatient = {
    room: "202",
    name: "박점순",
    age: 85,
    status: "고열 감지",
    vitals: { bt: 38.5, hr: 115, bp: "155/100" }
  };

  return (
    <main className="min-h-screen bg-slate-200 flex items-center justify-center py-10 font-sans">
      <div className="w-full max-w-[400px] h-[850px] bg-slate-50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border-[8px] border-slate-800">
        
        <header className="px-6 py-5 bg-gradient-to-r from-[#A50034] to-[#7B0027] text-white flex justify-between items-center rounded-b-3xl shadow-md z-10 relative">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight">
              <Heart size={18} className="fill-white" /> 우리 가족 안심 케어
            </h1>
            <p className="text-[12px] text-white/90 mt-1.5 font-medium">
              {mockPatient.room}호 <span className="font-bold">{mockPatient.name} 어르신 ({mockPatient.age}세)</span>
            </p>
          </div>
          <Link href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition shadow-sm">
            <Home size={18} />
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-10">
          
          {/* 이상 징후 알림 카드 */}
          <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-red-50">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">현재 <span className="text-red-600">집중 케어</span> 중입니다</h2>
            <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
              어르신의 체온 상승이 감지되어<br/>의료진과 ThinQ AI가 환경을 즉각 조절하고 있습니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 ml-1 flex items-center gap-1"><HeartPulse size={16} className="text-[#A50034]"/> 실시간 건강 수치</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1 flex items-center justify-center gap-1"><AlertCircle size={10} className="text-red-500"/>체온</p>
                <p className="text-xl font-black text-red-600">{mockPatient.vitals.bt}<span className="text-[10px] font-normal ml-0.5 text-slate-500">°C</span></p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1">혈압</p>
                <p className="text-lg font-black text-slate-700 mt-1.5">{mockPatient.vitals.bp}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1 flex items-center justify-center gap-1"><AlertCircle size={10} className="text-red-500"/>심박수</p>
                <p className="text-xl font-black text-red-600">{mockPatient.vitals.hr}<span className="text-[10px] font-normal ml-0.5 text-slate-500">bpm</span></p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 ml-1 flex items-center gap-1"><Wind size={16} className="text-blue-500"/> 병실 환경 제어 상태</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 text-center">
                <Thermometer className="text-blue-500 mb-1" size={24} />
                <span className="text-sm font-bold text-slate-700">26.1°C / 60%</span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">에어컨 냉방 가동중</span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 text-center">
                <Activity className="text-orange-500 mb-1" size={24} />
                <span className="text-sm font-bold text-slate-700">나쁨 (38μg)</span>
                <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md">환기시스템 최대가동</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 ml-1">자동화 케어 리포트</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-start gap-3">
                <div className="bg-red-50 text-red-500 p-2 rounded-lg mt-0.5"><Bell size={16}/></div>
                <div>
                  <p className="text-sm font-bold text-slate-800">의료진 긴급 호출</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">환자의 고열 및 심박수 이상을 감지하여 간호 스테이션에 알림을 발송했습니다.</p>
                  <p className="text-[10px] text-red-500 mt-1.5 font-bold">방금 전</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <div className="bg-blue-50 text-blue-500 p-2 rounded-lg mt-0.5"><Activity size={16}/></div>
                <div>
                  <p className="text-sm font-bold text-slate-800">병실 온도 조절 (에어컨)</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">환자의 체온 하강을 돕기 위해 병실 온도를 24도 목표로 냉방 가동합니다.</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">1분 전</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}