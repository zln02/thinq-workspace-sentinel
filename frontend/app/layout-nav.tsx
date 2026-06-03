// frontend/app/layout-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, ActivitySquare, ShieldCheck, Home, PlayCircle } from "lucide-react";

// 💡 데모(시연 모드) 메뉴가 새롭게 추가되었습니다!
const NAV_ITEMS = [
  { href: "/admin", label: "통합 관제", icon: <LayoutDashboard size={20} /> },
  { href: "/operations", label: "운영 로그", icon: <ActivitySquare size={20} /> },
  { href: "/admin/kpi", label: "KPI 리포트", icon: <ShieldCheck size={20} /> },
  { href: "/settings", label: "시스템 설정", icon: <Settings size={20} /> },
  { href: "/demo", label: "시연 모드 (Demo)", icon: <PlayCircle size={20} /> },
];

export function LayoutNav() {
  const pathname = usePathname();
  // 가족/모바일 화면에서는 메뉴바를 숨김 처리
  const isFamilyOrMobile = pathname?.startsWith("/family") || pathname?.startsWith("/mobile");

  if (isFamilyOrMobile) return null;

  return (
    // 💡 라이트모드(bg-white)와 다크모드(dark:bg-[#111827]) 전환 완벽 적용
    <nav className="w-64 min-h-screen bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors duration-300 shrink-0 z-50">
      <div className="p-6">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-6">Menu</h2>
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => {
            // 통합관제(/admin)는 하위 경로와 겹치지 않게 정확히 일치할 때만 활성화
            const isActive = item.href === "/admin" 
              ? pathname === "/admin" 
              : pathname?.startsWith(item.href);
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#A50034] text-white shadow-md shadow-[#A50034]/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={`${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* 하단 시스템 상태 및 홈 버튼 영역 */}
      <div className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2 font-medium">
          <Home size={18} /> 메인 화면으로 나가기
        </Link>

        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">System Status</p>
            <p className="text-xs font-bold text-green-600 dark:text-green-400">All Systems Go</p>
          </div>
        </div>
      </div>
    </nav>
  );
}