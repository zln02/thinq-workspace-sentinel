// frontend/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, ArrowRight, HeartPulse, Wrench, Briefcase, Smartphone,
  Radio, Activity, User, Lock, ChevronDown,
} from "lucide-react";

// 역할 원클릭 진입(데모 동선) — 카드 클릭 시 role 세팅 후 해당 제품 라인으로 이동
const ROLES = [
  { id: "nurse", role: "NURSE", name: "김민수 간호사", label: "간호사 (ICN)", desc: "실시간 병동 감염 감시", href: "/dashboard", Icon: HeartPulse },
  { id: "fm", role: "FM", name: "정욱현 시설관리자", label: "시설 관리자", desc: "ThinQ 가전 자동 방역", href: "/dashboard", Icon: Wrench },
  { id: "director", role: "DIRECTOR", name: "박원장 병원장", label: "병원장", desc: "ESG·ROI 경영 리포트", href: "/dashboard", Icon: Briefcase },
  { id: "guardian", role: null, name: "보호자", label: "보호자 앱", desc: "떨어져도 가족 안심", href: "/guardian/home", Icon: Smartphone },
] as const;

const STATS = [
  { Icon: Activity, value: "12", unit: "병실", label: "실시간 감염 감시" },
  { Icon: Radio, value: "201호", unit: "LIVE", label: "실센서 IoT 가동" },
  { Icon: ShieldAlert, value: "5", unit: "Tier", label: "AI 위험 등급" },
];

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enter = (r: (typeof ROLES)[number]) => {
    if (r.role) {
      localStorage.setItem("role", r.role);
      localStorage.setItem("userName", r.name);
    }
    router.push(r.href);
  };

  // 데모 PW는 환경변수로 주입(NEXT_PUBLIC_DEMO_PW). 미설정 시 로컬 개발 폴백.
  const DEMO_PW = process.env.NEXT_PUBLIC_DEMO_PW || "1234";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== DEMO_PW) { setError("비밀번호가 일치하지 않습니다."); return; }
    const r = ROLES.find((x) => x.id === id);
    if (r) enter(r);
    else setError("존재하지 않는 계정입니다. (nurse, director, fm 중 입력)");
  };

  return (
    <main className="min-h-screen bg-[#F3F7FB] text-slate-800 flex flex-col relative overflow-hidden font-sans">
      {/* 배경 글로우 (은은하게) */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#A50034]/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-500/[0.05] blur-[120px]" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-6xl mx-auto w-full">
        {/* 히어로 */}
        <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A50034]/10 border border-[#A50034]/30 text-[#A50034] text-xs font-bold mb-5">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A50034] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#A50034]" /></span>
            LG ThinQ · 스마트 요양병원 감염관리 플랫폼
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <ShieldAlert size={44} className="text-[#A50034]" strokeWidth={1.6} />
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900">
              ThinQ Space <span className="text-[#A50034]">Sentinel</span>
            </h1>
          </div>
          <p className="text-slate-600 text-base md:text-xl font-medium">
            요양병원 <span className="text-slate-900 font-bold">공기감염 조기경보</span> + ThinQ <span className="text-slate-900 font-bold">자동 방역</span>
          </p>
        </div>

        {/* 핵심 지표 스트립 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mb-10 animate-in fade-in duration-1000">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white border border-[#D6E2EF] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#A50034] shrink-0"><s.Icon size={20} /></div>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight truncate text-slate-900">{s.value}<span className="text-xs font-medium text-slate-400 ml-1">{s.unit}</span></p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 역할 진입 카드 */}
        <div className="w-full animate-in slide-in-from-bottom-8 duration-700">
          <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">역할을 선택해 입장</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => enter(r)}
                className="group text-left bg-white border border-[#D6E2EF] rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#A50034]/50 hover:shadow-lg flex flex-col gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#A50034] flex items-center justify-center text-slate-500 group-hover:text-white transition-colors"><r.Icon size={24} /></div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{r.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-[#A50034] transition-colors">
                  입장 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 직원 사번 로그인 (보조) */}
        <div className="w-full max-w-sm mt-8">
          <button onClick={() => setShowLogin((v) => !v)} className="mx-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <Lock size={12} /> 사번으로 로그인 <ChevronDown size={14} className={`transition-transform ${showLogin ? "rotate-180" : ""}`} />
          </button>
          {showLogin && (
            <form onSubmit={handleLogin} className="mt-4 bg-white border border-[#D6E2EF] rounded-2xl p-5 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="nurse / director / fm" className="w-full bg-[#F3F7FB] border border-[#D6E2EF] text-slate-800 text-sm px-9 py-2.5 rounded-lg focus:outline-none focus:border-[#A50034]" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 (1234)" className="w-full bg-[#F3F7FB] border border-[#D6E2EF] text-slate-800 text-sm px-9 py-2.5 rounded-lg focus:outline-none focus:border-[#A50034]" required />
              </div>
              {error && <p className="text-red-600 text-xs font-medium text-center">{error}</p>}
              <button type="submit" className="w-full bg-[#A50034] hover:bg-[#7B0027] text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">로그인 <ArrowRight size={16} /></button>
            </form>
          )}
        </div>
      </div>

      <footer className="relative text-center text-[11px] text-slate-400 pb-6">
        © 2026 LG DX School · ThinQ Workspace Sentinel — B2G 요양병원 감염관리 PoC
      </footer>
    </main>
  );
}
