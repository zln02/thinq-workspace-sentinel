// frontend/app/select/page.tsx — 최상위 관리자(SUPER) 전체 대시보드 선택 화면
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, HeartPulse, Wrench, Briefcase, Smartphone, ArrowRight, LogOut } from "lucide-react";
import { getSession, clearSession, type Role, type Session } from "@/lib/auth";

const VIEWS: { role: Role; label: string; desc: string; href: string; Icon: typeof HeartPulse }[] = [
  { role: "NURSE",    label: "간호사 대시보드",   desc: "실시간 병동 감염 감시",     href: "/dashboard",     Icon: HeartPulse },
  { role: "FM",       label: "시설관리자 대시보드", desc: "ThinQ 가전 자동 방역 흐름", href: "/dashboard",     Icon: Wrench },
  { role: "DIRECTOR", label: "병원장 대시보드",   desc: "ESG·ROI 경영 리포트",       href: "/dashboard",     Icon: Briefcase },
  { role: "GUARDIAN", label: "보호자 앱",         desc: "떨어져도 가족 안심",        href: "/guardian", Icon: Smartphone },
];

export default function SelectPage() {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.account !== "SUPER") { router.replace("/"); return; }
    setSessionState(s);
  }, [router]);

  const go = (role: Role, href: string) => {
    localStorage.setItem("role", role); // SUPER 가 볼 뷰 전환 (account=SUPER 유지)
    router.push(href);
  };

  const logout = () => { clearSession(); router.replace("/"); };

  if (!session) return null;

  return (
    <main className="min-h-screen bg-[#F3F7FB] text-slate-800 flex flex-col items-center justify-center relative overflow-hidden font-sans px-4">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#A50034]/[0.06] blur-[120px]" />

      <div className="relative w-full max-w-3xl animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#A50034] text-white flex items-center justify-center shadow-lg"><ShieldAlert size={22} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900">통합 관제 — 전체 대시보드</h1>
              <p className="text-sm text-slate-500">{session.hospital} · {session.region} · {session.name}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#A50034] transition"><LogOut size={16} /> 로그아웃</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VIEWS.map((v) => (
            <button
              key={v.label}
              onClick={() => go(v.role, v.href)}
              className="group bg-white border border-slate-200 hover:border-[#A50034]/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#A50034]/10 text-[#A50034] flex items-center justify-center group-hover:scale-110 transition"><v.Icon size={24} /></div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{v.label}</p>
                <p className="text-sm text-slate-500">{v.desc}</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-[#A50034] transition" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
