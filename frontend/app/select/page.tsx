// frontend/app/select/page.tsx — 최상위 관리자(SUPER) 전체 대시보드 선택 화면
// 디자인: Stitch v2 · 사이드바와 동일 톤 (Material Symbols · LG레드 #7a0024 · 카드 상단 액센트 + hover 리프트)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession, type Role, type Session } from "@/lib/auth";

const VIEWS: { role: Role; label: string; desc: string; href: string; icon: string }[] = [
  { role: "NURSE",    label: "간호사 관제",     desc: "실시간 병동 감염 감시 · 환자 환경 모니터링 및 즉각 경보 처리", href: "/dashboard", icon: "monitor_heart" },
  { role: "FM",       label: "시설·가전 제어",   desc: "ThinQ 가전 자동 방역 흐름 · HVAC 제어 및 시설 유지보수",      href: "/dashboard", icon: "account_tree" },
  { role: "DIRECTOR", label: "경영 리포트",     desc: "ESG·ROI 경영 리포트 · 감염관리 성과 및 법규 준수 증빙",       href: "/dashboard", icon: "analytics" },
  { role: "GUARDIAN", label: "보호자 안심 앱",   desc: "떨어져도 가족 안심 · 환자 환경 상태 및 직접 소통 포털",       href: "/guardian",  icon: "family_home" },
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
      {/* 상단 바 — 사이드바 로고 톤 */}
      <header className="h-16 w-full bg-white border-b border-slate-200 shadow-sm flex justify-between items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7a0024] text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined fill">coronavirus</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#7a0024] leading-tight">ThinQ Sentinel</h1>
            <p className="text-[11px] text-slate-400">감염관리 통합 관제</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#7a0024] transition-colors px-3 py-2 rounded-lg hover:bg-[#fff0f0]">
          <span className="material-symbols-outlined text-[18px]">logout</span> 로그아웃
        </button>
      </header>

      {/* 본문 — 운영 포털 선택 */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="inline-flex items-center gap-1.5 bg-[#fff0f0] text-[#7a0024] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              <span className="material-symbols-outlined text-[16px]">shield_person</span> 통합관리자 · 전체 열람 권한
            </div>
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
                  <span className="material-symbols-outlined fill text-[28px]">{v.icon}</span>
                </div>
                <div className="flex-grow">
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">{v.label}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-[#7a0024] group-hover:translate-x-1 transition-all self-center flex-shrink-0">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
