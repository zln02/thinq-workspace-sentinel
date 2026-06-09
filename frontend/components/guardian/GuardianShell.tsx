"use client";
// 보호자 앱 모바일 셸 — 프레임 + 하단 탭바 + SW 등록 + 전역 알림 기록/푸시
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Activity, Bell, Settings as SettingsIcon } from "lucide-react";
import { useLiveWard } from "@/lib/useSentinel";
import { getSession, pushAlert, TIER_STATE } from "@/lib/guardian";
import type { Tier } from "@/lib/tier";

const TABS = [
  { href: "/guardian/home", label: "홈", icon: Home },
  { href: "/guardian/ward", label: "병동", icon: Activity },
  { href: "/guardian/alerts", label: "알림", icon: Bell },
  { href: "/guardian/settings", label: "설정", icon: SettingsIcon },
];

export default function GuardianShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAuthPage = pathname?.endsWith("/guardian") || pathname?.includes("/guardian/login");
  const { data } = useLiveWard(session?.space_id ?? "ward_a");
  const prevTier = useRef<Tier | null>(null);

  // SW 등록 (basePath 자동 보정)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const base = window.location.pathname.split("/guardian")[0]; // "" or "/sentinel"
    navigator.serviceWorker.register(`${base}/guardian-sw.js`, { scope: `${base}/guardian` }).catch(() => {});
  }, []);

  // 미로그인 시 로그인으로
  useEffect(() => {
    if (!isAuthPage && !getSession()) router.replace("/guardian/login");
  }, [isAuthPage, router]);

  // 전역: tier 전환 → 알림 이력 + 로컬 푸시 (ALERT 이상)
  useEffect(() => {
    const t = data?.tier as Tier | undefined;
    if (!t) return;
    if (prevTier.current && t !== prevTier.current) {
      pushAlert(t, Date.now());
      const rank: Record<Tier, number> = { MONITOR: 0, CAUTION: 1, ALERT: 2, HIGH_RISK: 3, CRITICAL: 4 };
      if (rank[t] >= 2 && Notification?.permission === "granted") {
        const s = TIER_STATE[t];
        try {
          new Notification(`${s.emoji} ${session?.room ?? "병동"} — ${s.st}`, { body: s.msg });
        } catch {
          /* ignore */
        }
      }
    }
    prevTier.current = t;
  }, [data?.tier, session?.room]);

  return (
    <div className="guardian-app min-h-screen w-full flex justify-center bg-slate-100 dark:bg-black">
      <div className="relative w-full max-w-[430px] min-h-screen bg-[#f6f7fb] dark:bg-[#0b0f1a] flex flex-col shadow-xl">
        <div className="guardian-scroll flex-1 overflow-y-auto" style={{ paddingBottom: isAuthPage ? 0 : "calc(4rem + env(safe-area-inset-bottom))" }}>
          {children}
        </div>
        {!isAuthPage && (
          <nav className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex pb-safe">
            {TABS.map((t) => {
              const active = pathname?.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} className={`flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold ${active ? "text-[#A50034]" : "text-slate-400"}`}>
                  <Icon size={21} strokeWidth={active ? 2.6 : 2} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
