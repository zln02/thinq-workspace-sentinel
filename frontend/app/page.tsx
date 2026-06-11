// frontend/app/page.tsx — 통합 로그인 (프레임 카드 · 좌 감염차단 그래픽 / 우 폼)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ArrowRight, User, Lock, Building2, ChevronDown,
  Activity, Wind, BrainCircuit,
} from "lucide-react";
import { HOSPITALS, ROLE_HOME, authenticate, setSession, bindRegion } from "@/lib/auth";

const FEATURES = [
  { Icon: Activity, label: "실시간 IoT 환경 감시" },
  { Icon: BrainCircuit, label: "AI 5-Tier 감염위험 예측" },
  { Icon: Wind, label: "ThinQ 가전 자동 방역" },
];

// 코로나형 바이러스 입자 (원 + 방사 스파이크 + 끝 점)
function Virus({ x, y, r, o }: { x: number; y: number; r: number; o: number }) {
  const spikes = Array.from({ length: 10 }, (_, i) => (i * Math.PI * 2) / 10);
  return (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      {spikes.map((a, i) => {
        const x1 = Math.cos(a) * r, y1 = Math.sin(a) * r;
        const x2 = Math.cos(a) * (r + 4), y2 = Math.sin(a) * (r + 4);
        return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="1.2" /><circle cx={x2} cy={y2} r="1.4" fill="#fff" /></g>;
      })}
      <circle r={r} fill="none" stroke="#fff" strokeWidth="1.4" />
      <circle r={r * 0.45} fill="#fff" opacity="0.5" />
    </g>
  );
}

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

        {/* ───────── 좌: 감염 차단 그래픽 패널 ───────── */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#A50034] via-[#8a002b] to-[#4d0018] text-white p-9 min-h-[580px]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-[90px]" />

          {/* ── 감염 차단 씬: 바이러스 입자를 보호 돔(쉴드)이 막고, 청정 기류가 흐른다 ── */}
          <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 360 580" preserveAspectRatio="xMidYMid slice" fill="none">
            {/* 보호 돔(반투명 방어막) — 하단 병동을 덮는 아치 */}
            <defs>
              <radialGradient id="dome" cx="50%" cy="100%" r="80%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
                <stop offset="70%" stopColor="#fff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M30 360 A150 150 0 0 1 330 360" fill="url(#dome)" />
            <path d="M30 360 A150 150 0 0 1 330 360" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 7" />
            {/* 방어막 위에서 차단되는 바이러스 입자들 */}
            <Virus x={70} y={120} r={10} o={0.5} />
            <Virus x={250} y={90} r={13} o={0.65} />
            <Virus x={300} y={185} r={8} o={0.4} />
            <Virus x={130} y={70} r={7} o={0.38} />
            <Virus x={190} y={150} r={11} o={0.55} />
            {/* 청정 기류 (돔 안쪽으로 흐르는 곡선) */}
            <path d="M70 470 Q150 430 130 380" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
            <path d="M180 490 Q200 440 200 390" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
            <path d="M290 470 Q230 430 250 385" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
          </svg>

          {/* 브랜드 마크 */}
          <div className="relative flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><ShieldCheck size={22} /></div>
            <span className="font-bold tracking-tight">ThinQ Sentinel</span>
          </div>

          {/* 카피 + tier 칩 + 기능 */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-5">
              {["#16a34a", "#eab308", "#f97316", "#dc2626", "#7f1d1d"].map((c, i) => (
                <span key={i} className="h-1.5 rounded-full" style={{ width: i === 2 ? 34 : 18, background: c, opacity: i === 2 ? 1 : 0.5 }} />
              ))}
              <span className="ml-2 text-[11px] font-bold text-white/85">5-Tier 감염위험</span>
            </div>
            <h2 className="text-[1.7rem] leading-snug font-black tracking-tight">
              감염 확산 전,<br />가전이 <span className="underline decoration-white/40 underline-offset-4">선제 차단</span>합니다
            </h2>
            <p className="text-white/75 text-[13px] mt-3 leading-relaxed">
              RSV·인플루엔자·노로를 3주 전에 예측해 자동 방역
            </p>
            <div className="mt-6 space-y-2.5">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-[13.5px] text-white/85">
                  <f.Icon size={16} className="text-white/70 shrink-0" /> {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-[11px] text-white/55">
            <span>LG ThinQ</span><span className="w-1 h-1 rounded-full bg-white/40" />
            <span>질병청 UIS 연동</span><span className="w-1 h-1 rounded-full bg-white/40" />
            <span>ISMS-P 대응</span>
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
