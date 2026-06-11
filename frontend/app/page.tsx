// frontend/app/page.tsx — 통합 로그인 (병원 선택 + ID/PW)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowRight, User, Lock, Building2 } from "lucide-react";
import { HOSPITALS, ROLE_HOME, authenticate, setSession, bindRegion } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [hospitalId, setHospitalId] = useState(HOSPITALS[0].id);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const acc = authenticate(id, pw);
    if (!acc) { setError("아이디 또는 비밀번호가 올바르지 않습니다."); return; }
    const hospital = HOSPITALS.find((h) => h.id === hospitalId) ?? HOSPITALS[0];
    setBusy(true);
    setSession({
      account: acc.role, role: acc.role, name: acc.name,
      hospital: hospital.name, hospitalId: hospital.id, region: hospital.region,
    });
    // 선택 병원 지역으로 외부 감염신호 고정 (보호자 제외)
    if (acc.role !== "GUARDIAN") await bindRegion(hospital.region);
    router.push(ROLE_HOME[acc.role]);
  };

  return (
    <main className="min-h-screen bg-[#F3F7FB] text-slate-800 flex flex-col items-center justify-center relative overflow-hidden font-sans px-4">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#A50034]/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-500/[0.05] blur-[120px]" />

      <div className="relative w-full max-w-md animate-in slide-in-from-bottom-4 duration-700">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#A50034] text-white mb-4 shadow-lg">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">ThinQ Workspace Sentinel</h1>
          <p className="text-sm text-slate-500 mt-1">요양병원 감염관리 통합 관제</p>
        </div>

        {/* 로그인 카드 */}
        <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xl p-7 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">병원 선택</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#A50034] appearance-none"
              >
                {HOSPITALS.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} · {h.region}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">아이디</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={id} onChange={(e) => setId(e.target.value)} autoComplete="username"
                placeholder="아이디" required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#A50034]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
                placeholder="비밀번호" required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#A50034]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-[#A50034] font-semibold">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full bg-[#A50034] hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {busy ? "로그인 중…" : <>로그인 <ArrowRight size={16} /></>}
          </button>

          <p className="text-[11px] text-slate-400 text-center pt-1 leading-relaxed">
            데모 계정 — admin / nurse / fm / director / guardian<br />
            (admin은 전체 열람, 비밀번호: admin은 admin · 그 외 1234)
          </p>
        </form>
      </div>
    </main>
  );
}
