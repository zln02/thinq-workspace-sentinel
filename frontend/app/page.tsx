// frontend/app/page.tsx — 통합 로그인 (엔터프라이즈 스플릿 레이아웃)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ArrowRight, User, Lock, Building2,
  Activity, Wind, BrainCircuit, ChevronDown,
} from "lucide-react";
import { HOSPITALS, ROLE_HOME, authenticate, setSession, bindRegion } from "@/lib/auth";

const FEATURES = [
  { Icon: Activity, title: "실시간 IoT 환경 감시", desc: "CO₂·재실·온습도·PM 24시간 모니터링" },
  { Icon: BrainCircuit, title: "AI 5-Tier 감염위험 예측", desc: "Wells-Riley·Rudnick-Milton 정량 모델" },
  { Icon: Wind, title: "ThinQ 가전 자동 방역", desc: "위험 감지 즉시 환기·정화 선제 가동" },
];

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
    <main className="min-h-screen grid lg:grid-cols-2 font-sans">
      {/* ───────── 좌: 브랜드 패널 ───────── */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#A50034] via-[#8a002b] to-[#5e001d] text-white p-12">
        {/* 장식 글로우 + 그리드 */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-white/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 w-[26rem] h-[26rem] rounded-full bg-black/20 blur-[100px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }}
        />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><ShieldCheck size={24} /></div>
          <div>
            <p className="font-extrabold tracking-tight leading-none">ThinQ Workspace Sentinel</p>
            <p className="text-[12px] text-white/70 mt-1">요양병원 감염관리 통합 관제</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-[2.6rem] leading-[1.15] font-black tracking-tight">
            못 막던 감염을,<br />가전이 <span className="text-white/95 underline decoration-white/30 underline-offset-8">3주 전에</span> 막습니다
          </h2>
          <p className="text-white/75 mt-5 text-[15px] leading-relaxed max-w-md">
            LG ThinQ 가전 8종과 IoT 센서, 외부 감염병 신호를 결합해
            공간 감염 위험을 사전 예측하고 자동으로 환경을 제어합니다.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white/12 backdrop-blur flex items-center justify-center shrink-0"><f.Icon size={19} /></div>
                <div>
                  <p className="font-bold text-[15px]">{f.title}</p>
                  <p className="text-white/65 text-[13px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-white/55">
          <span>LG ThinQ</span><span className="w-1 h-1 rounded-full bg-white/40" />
          <span>질병청 UIS 연동</span><span className="w-1 h-1 rounded-full bg-white/40" />
          <span>ISMS-P 대응</span>
        </div>
      </section>

      {/* ───────── 우: 로그인 폼 ───────── */}
      <section className="flex items-center justify-center bg-[#F3F7FB] px-6 py-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#A50034] text-white flex items-center justify-center"><ShieldCheck size={22} /></div>
            <p className="font-extrabold text-slate-900">ThinQ Workspace Sentinel</p>
          </div>

          <h1 className="text-2xl font-black text-slate-900">로그인</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-7">병원을 선택하고 계정으로 로그인하세요.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="병원" icon={<Building2 size={16} />}>
              <select
                value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm pl-9 pr-9 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/30 focus:border-[#A50034] appearance-none transition"
              >
                {HOSPITALS.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.region}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </Field>

            <Field label="아이디" icon={<User size={16} />}>
              <input
                value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="아이디" required
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/30 focus:border-[#A50034] transition"
              />
            </Field>

            <Field label="비밀번호" icon={<Lock size={16} />}>
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="비밀번호" required
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A50034]/30 focus:border-[#A50034] transition"
              />
            </Field>

            {error && (
              <p className="text-xs text-[#A50034] font-semibold bg-[#A50034]/5 border border-[#A50034]/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={busy}
              className="w-full bg-[#A50034] hover:bg-[#8a002b] active:scale-[0.99] disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#A50034]/20"
            >
              {busy ? "로그인 중…" : <>로그인 <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 mb-2">데모 계정</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
              <span><b className="text-slate-700">admin</b> / admin · 전체</span>
              <span><b className="text-slate-700">nurse</b> / 1234 · 간호사</span>
              <span><b className="text-slate-700">fm</b> / 1234 · 시설관리</span>
              <span><b className="text-slate-700">director</b> / 1234 · 병원장</span>
              <span><b className="text-slate-700">guardian</b> / 1234 · 보호자</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-8">© 2026 LG DX School · 5분 대기조</p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-1.5 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}
