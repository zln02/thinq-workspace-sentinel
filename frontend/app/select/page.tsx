// frontend/app/select/page.tsx — 최상위 관리자(SUPER) 전체 대시보드 선택 화면
// 디자인: Stitch v2 운영 포털 선택 톤 (상단 3px 액센트 + 소프트 섀도우 + hover 리프트, LG레드 #7a0024)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, HeartPulse, Wrench, Briefcase, Smartphone, ArrowRight, LogOut } from "lucide-react";
import { getSession, clearSession, type Role, type Session } from "@/lib/auth";

const VIEWS: { role: Role; label: string; desc: string; href: string; Icon: typeof HeartPulse }[] = [
  { role: "NURSE",    label: "간호사 대시보드",   desc: "실시간 병동 감염 감시 · 환자 환경 모니터링 및 즉각 경보 처리", href: "/dashboard", Icon: HeartPulse },
  { role: "FM",       label: "시설관리자 대시보드", desc: "ThinQ 가전 자동 방역 흐름 · HVAC 제어 및 시설 유지보수",      href: "/dashboard", Icon: Wrench },
  { role: "DIRECTOR", label: "병원장 대시보드",   desc: "ESG·ROI 경영 리포트 · 감염관리 성과 및 법규 준수 증빙",       href: "/dashboard", Icon: Briefcase },
  { role: "GUARDIAN", label: "보호자 안심 앱",     desc: "떨어져도 가족 안심 · 환자 환경 상태 및 직접 소통 포털",       href: "/guardian",  Icon: Smartphone },
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
    <main className="min-h-screen bg-[#F3F7FB] text-slate-800 flex flex-col font-sans">
      {/* 상단 바 */}
      <header className="h-20 w-full bg-white border-b border-slate-200 shadow-sm flex justify-between items-center px-6 sm:px-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-none w-9 h-9 rounded-lg bg-[#7a0024] text-white flex items-center justify-center shadow-sm"><ShieldAlert size={20} /></span>
          <span className="text-lg font-black tracking-tight text-[#7a0024]">ThinQ Space Sentinel</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#7a0024] transition-colors p-2 rounded-full hover:bg-[#fff0f0]">
          <LogOut size={18} /> 로그아웃
        </button>
      </header>

      {/* 본문 — 운영 포털 선택 */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-3xl font-black text-slate-900 mb-3">운영 포털 선택</h1>
            <p className="text-base text-slate-500 max-w-2xl mx-auto">
              {session.hospital} · {session.region} · {session.name} — 접근할 운영 대시보드를 선택하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VIEWS.map((v, i) => (
              <button
                key={v.label}
                onClick={() => go(v.role, v.href)}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-[#7a0024] p-6 text-left flex items-start gap-5
                           shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.09)]
                           animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
              >
                <div className="w-14 h-14 rounded-full bg-[#fff0f0] text-[#7a0024] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <v.Icon size={26} />
                </div>
                <div className="flex-grow">
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">{v.label}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-[#7a0024] group-hover:translate-x-1 transition-all self-center flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
