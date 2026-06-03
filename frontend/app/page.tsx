// frontend/app/page.tsx
"use client";

import Link from "next/link";
import { ShieldAlert, Users, Building2 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-8">
      {/* 💡 요청하신 대로 타이틀을 수정하고, 아래의 회색 설명 텍스트를 삭제했습니다. */}
      <div className="flex flex-col items-center mb-16 text-center animate-in slide-in-from-bottom-4 duration-700">
        <ShieldAlert size={64} className="text-[#A50034] mb-6" strokeWidth={1.5} />
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-4">
          ThinQ Space <span className="text-[#A50034]">Sentinel</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link href="/admin" className="group bg-[#111827] border border-slate-800 hover:border-[#A50034]/50 rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(165,0,52,0.3)]">
          <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-[#A50034] flex items-center justify-center mb-4 transition-colors">
            <ShieldAlert size={28} className="text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">통합 관제 시스템</h2>
          <p className="text-sm text-slate-500">감염관리자 및 시설관리용 대시보드</p>
        </Link>

        <Link href="/executive" className="group bg-[#111827] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.2)]">
          <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-blue-600 flex items-center justify-center mb-4 transition-colors">
            <Building2 size={28} className="text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">시설장 대시보드</h2>
          <p className="text-sm text-slate-500">병원 경영진 ROI 및 컴플라이언스 관제</p>
        </Link>

        <Link href="/family" className="group bg-[#111827] border border-slate-800 hover:border-green-500/50 rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(34,197,94,0.2)]">
          <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-green-500 flex items-center justify-center mb-4 transition-colors">
            <Users size={28} className="text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">우리 가족 안심 케어</h2>
          <p className="text-sm text-slate-500">환자 보호자 전용 모바일 뷰</p>
        </Link>
      </div>
    </main>
  );
}