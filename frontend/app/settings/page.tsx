// frontend/app/settings/page.tsx
"use client";

import { Settings, Moon, Sun, Bell, Shield, Smartphone, Home } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme(); // 💡 글로벌 테마 함수 가져오기

  return (
    <main className="p-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">시스템 설정</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">대시보드 테마 및 알림 기본 설정</p>
          </div>
        </div>
        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-lg text-sm font-semibold shadow-sm">
          <Home size={16} /> 메인으로
        </Link>
      </header>

      <div className="max-w-3xl space-y-6">
        <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Sun size={20}/> 디스플레이 테마</h2>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
            <div>
              <p className="text-slate-800 dark:text-slate-200 font-semibold mb-1">관제 센터 테마 변경</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">우측 스위치를 눌러 라이트/다크 모드를 전환해보세요.</p>
            </div>
            {/* 💡 진짜로 작동하는 테마 토글 버튼 */}
            <button 
              onClick={toggleTheme}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${isDark ? 'bg-[#A50034]' : 'bg-slate-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${isDark ? 'translate-x-6' : 'translate-x-0'}`}>
                {isDark ? <Moon size={14} className="text-[#A50034]"/> : <Sun size={14} className="text-slate-500"/>}
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}