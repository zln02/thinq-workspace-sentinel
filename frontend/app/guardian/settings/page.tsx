"use client";
// 설정 — 알림 권한 on/off, 보호자·환자 정보, 로그아웃
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, LogOut, ShieldCheck } from "lucide-react";
import { getSession, clearSession } from "@/lib/guardian";

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [notif, setNotif] = useState(false);
  useEffect(() => {
    setSession(getSession());
    setNotif(typeof Notification !== "undefined" && Notification.permission === "granted");
  }, []);

  const toggleNotif = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotif(true);
      return;
    }
    const p = await Notification.requestPermission();
    setNotif(p === "granted");
  };

  const logout = () => {
    clearSession();
    router.replace("/guardian/login");
  };

  return (
    <div className="flex flex-col">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 bg-[#A50034] text-white">
        <p className="text-[11px] text-white/70">설정</p>
        <h1 className="text-lg font-extrabold">내 정보 · 알림</h1>
      </header>

      {/* 보호자/환자 정보 */}
      <section className="px-4 mt-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-[#A50034]/10 text-[#A50034] flex items-center justify-center">
            <User size={24} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-extrabold text-slate-800 dark:text-white">{session?.guardian ?? "보호자"} 님</p>
            <p className="text-[12px] text-slate-500">{session?.patient ?? "어르신"} · {session?.room ?? "병동"}</p>
          </div>
        </div>
      </section>

      {/* 알림 토글 */}
      <section className="px-4 mt-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
            <Bell size={19} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">실시간 안전 알림</p>
            <p className="text-[11px] text-slate-400">상태 변화 시 휴대폰 알림</p>
          </div>
          <button
            onClick={toggleNotif}
            className={`w-12 h-7 rounded-full relative transition ${notif ? "bg-[#A50034]" : "bg-slate-300 dark:bg-slate-700"}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${notif ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </section>

      {/* 안내 */}
      <section className="px-4 mt-4">
        <div className="bg-[#A50034]/5 dark:bg-[#A50034]/10 rounded-2xl p-4 flex gap-3">
          <ShieldCheck size={20} className="text-[#A50034] shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
            이 서비스는 병동의 <b>공기질·감염 위험을 선제적으로 관리</b>하는 상태를 보여드립니다. 의료 진단이 아니며, 모든 조치 이력은 병원 감염관리 증빙으로 자동 기록됩니다.
          </p>
        </div>
      </section>

      <button onClick={logout} className="mx-4 mt-5 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[.98] transition">
        <LogOut size={17} /> 로그아웃
      </button>

      <p className="mt-4 text-[10.5px] text-slate-400 text-center">LG ThinQ 케어 · v1.0 · 시연용 데모</p>
    </div>
  );
}
