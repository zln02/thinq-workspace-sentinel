// frontend/app/page.tsx — 통합 로그인 (프레임 카드 · 좌 병동 사진 / 우 폼)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, User, Lock, Building2, ChevronDown } from "lucide-react";
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
    if (acc.role !== "GUARDIAN") await bindRegion(hospital.region);
    router.push(ROLE_HOME[acc.role]);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">

        {/* ───────── 좌: Spline 3D 파티클 패널 ───────── */}
        <div className="relative hidden md:block min-h-[580px] bg-[#160007]">
          {/* 외부 임베드(데모용). 오프라인/차단 시 하단 그라데이션+카피만 보임 — 폼은 정상 */}
          <iframe
            src="https://my.spline.design/particlenebula-9bJdvFnWOh4OCliIF6lbKqxs/"
            title="ThinQ Sentinel" loading="lazy"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ border: 0 }}
          />
          {/* 하단 그라데이션 (카피 가독성 + 워터마크 가림) */}
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#160007] via-[#160007]/80 to-transparent" />

          {/* 상단 브랜드 마크 */}
          <div className="absolute top-6 left-6 flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"><ShieldCheck size={20} /></div>
            <span className="font-bold text-sm tracking-tight">ThinQ Sentinel</span>
          </div>

          {/* 하단 카피 + tier 게이지 */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="flex items-center gap-1.5 mb-4">
              {["#16a34a", "#eab308", "#f97316", "#dc2626", "#7f1d1d"].map((c, i) => (
                <span key={i} className="h-1.5 rounded-full" style={{ width: i === 2 ? 30 : 16, background: c, opacity: i === 2 ? 1 : 0.55 }} />
              ))}
              <span className="ml-1.5 text-[11px] font-bold text-white/90">5-Tier 감염위험 등급</span>
            </div>
            <h2 className="text-[1.7rem] leading-snug font-black tracking-tight">
              감염 확산 전,<br />가전이 <span className="underline decoration-white/40 underline-offset-4">선제 차단</span>합니다
            </h2>
            <p className="text-white/80 text-[13px] mt-3 leading-relaxed">
              RSV·인플루엔자·노로를 3주 전에 예측 · IoT 감시 + ThinQ 자동 방역
            </p>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/65">
              <span>LG ThinQ</span><span className="w-1 h-1 rounded-full bg-white/40" />
              <span>질병청 UIS 연동</span><span className="w-1 h-1 rounded-full bg-white/40" />
              <span>ISMS-P 대응</span>
            </div>
          </div>
        </div>

        {/* ───────── 우: 로그인 폼 ───────── */}
        <div className="p-8 sm:p-11 flex flex-col justify-center">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-[#A50034] text-white flex items-center justify-center shadow-lg shadow-[#A50034]/25 mb-3"><ShieldCheck size={26} /></div>
            <h1 className="text-xl font-black text-slate-900">ThinQ Workspace Sentinel</h1>
            <p className="text-[13px] text-slate-500 mt-1">요양병원 감염관리 통합 관제</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5">
            <Field label="병원" icon={<Building2 size={16} />}>
              <select
                value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-9 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/25 focus:border-[#A50034] focus:bg-white appearance-none transition"
              >
                {HOSPITALS.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.region}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </Field>

            <Field label="아이디" icon={<User size={16} />}>
              <input
                value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="아이디" required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/25 focus:border-[#A50034] focus:bg-white transition"
              />
            </Field>

            <Field label="비밀번호" icon={<Lock size={16} />}>
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="비밀번호" required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/25 focus:border-[#A50034] focus:bg-white transition"
              />
            </Field>

            {error && (
              <p className="text-xs text-[#A50034] font-semibold bg-[#A50034]/5 border border-[#A50034]/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={busy}
              className="w-full bg-[#A50034] hover:bg-[#8a002b] active:scale-[0.99] disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#A50034]/20 mt-1"
            >
              {busy ? "로그인 중…" : <>로그인 <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 mb-2 text-center">데모 계정</p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span><b className="text-slate-700">admin</b>/admin</span>
              <span><b className="text-slate-700">nurse</b>/1234</span>
              <span><b className="text-slate-700">fm</b>/1234</span>
              <span><b className="text-slate-700">director</b>/1234</span>
              <span><b className="text-slate-700">guardian</b>/1234</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-1.5 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">{icon}</span>
        {children}
      </div>
    </div>
  );
}
