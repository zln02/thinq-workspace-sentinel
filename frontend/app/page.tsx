// frontend/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== "1234") {
      setError("비밀번호가 일치하지 않습니다. (데모 PW: 1234)");
      return;
    }

    if (id === "nurse") {
      localStorage.setItem("role", "NURSE");
      localStorage.setItem("userName", "김민수 간호사");
      router.push("/dashboard");
    } else if (id === "director") {
      localStorage.setItem("role", "DIRECTOR");
      localStorage.setItem("userName", "박원장 병원장");
      router.push("/dashboard");
    } else if (id === "fm") {
      localStorage.setItem("role", "FM");
      localStorage.setItem("userName", "정욱현 시설관리자");
      router.push("/dashboard");
    } else {
      setError("존재하지 않는 계정입니다. (nurse, director, fm 중 입력)");
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4">
      
      {/* 타이틀 영역 */}
      <div className="flex flex-col items-center mb-8 text-center animate-in slide-in-from-bottom-4 duration-700">
        <ShieldAlert size={56} className="text-[#A50034] mb-4" strokeWidth={1.5} />
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
          ThinQ Space <span className="text-[#A50034]">Sentinel</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base">LG 스마트 요양병원 환경 및 감염 관리 솔루션</p>
      </div>

      {/* 로그인 폼 영역 */}
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
        <h2 className="text-xl font-bold text-white mb-6">시스템 접속</h2>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">사번 (ID)</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                placeholder="nurse / director / fm"
                className="w-full bg-[#0B1120] border border-slate-700 text-white px-11 py-3.5 rounded-xl focus:outline-none focus:border-[#A50034] transition-colors" 
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">비밀번호 (PW)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="비밀번호 입력 (1234)"
                className="w-full bg-[#0B1120] border border-slate-700 text-white px-11 py-3.5 rounded-xl focus:outline-none focus:border-[#A50034] transition-colors" 
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" className="w-full bg-[#A50034] hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4">
            로그인 <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">※ 데모 테스트 ID: <b className="text-slate-300">nurse</b> / <b className="text-slate-300">director</b> / <b className="text-slate-300">fm</b> (PW: 1234)</p>
        </div>
      </div>
      
    </main>
  );
}