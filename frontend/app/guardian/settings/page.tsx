"use client";
// 설정 — 알림 on/off(실제 토글), 보호자·환자 정보, 로그아웃(확인)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, LogOut, ShieldCheck } from "lucide-react";
import { getSession, clearSession, getNotifEnabled, setNotifEnabled } from "@/lib/guardian";
import { PageHeader, Card } from "@/components/guardian/ui";

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [notif, setNotif] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setNotif(getNotifEnabled() && typeof Notification !== "undefined" && Notification.permission === "granted");
  }, []);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const toggleNotif = async () => {
    if (typeof Notification === "undefined") {
      showToast("이 기기는 알림을 지원하지 않습니다");
      return;
    }
    if (notif) {
      // 끄기 — 앱 차원에서 OFF (OS 권한과 별개)
      setNotifEnabled(false);
      setNotif(false);
      showToast("알림을 껐습니다");
      return;
    }
    // 켜기
    if (Notification.permission === "denied") {
      showToast("휴대폰 설정 > 알림에서 권한을 허용해 주세요");
      return;
    }
    const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (p === "granted") {
      setNotifEnabled(true);
      setNotif(true);
      showToast("알림을 켰습니다");
    } else {
      showToast("알림 권한이 필요합니다");
    }
  };

  const logout = () => {
    clearSession();
    setNotifEnabled(false);
    router.replace("/guardian/login");
  };

  return (
    <div className="flex flex-col pb-6">
      <PageHeader subtitle="설정" title="내 정보 · 알림" />

      {/* 보호자/환자 정보 */}
      <section className="px-4 mt-4">
        <Card className="p-4 flex items-center gap-3.5">
          <span className="w-[52px] h-[52px] rounded-2xl bg-care-red-soft text-care-red flex items-center justify-center">
            <User size={26} />
          </span>
          <div className="flex-1">
            <p className="text-[16px] font-extrabold text-care-ink">{session?.guardian ?? "보호자"} 님</p>
            <p className="text-[13px] text-care-ink-2 mt-0.5">{session?.patient ?? "어르신"} · {session?.room ?? "병동"}</p>
          </div>
        </Card>
      </section>

      {/* 알림 토글 */}
      <section className="px-4 mt-4">
        <Card className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-care-ink-2 flex items-center justify-center">
            <Bell size={19} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-care-ink">실시간 안전 알림</p>
            <p className="text-[12px] text-care-ink-3 mt-0.5">상태가 바뀌면 휴대폰으로 알려드립니다</p>
          </div>
          <button
            onClick={toggleNotif}
            aria-label="알림 켜기/끄기"
            className={`w-[52px] h-[30px] rounded-full relative transition-colors shrink-0 ${notif ? "bg-care-red" : "bg-zinc-300 dark:bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 w-[26px] h-[26px] rounded-full bg-white shadow transition-all ${notif ? "left-[23px]" : "left-0.5"}`} />
          </button>
        </Card>
      </section>

      {/* 안내 */}
      <section className="px-4 mt-4">
        <Card className="p-4 flex gap-3" style={{ background: "var(--care-red-soft)", boxShadow: "none" }}>
          <ShieldCheck size={20} className="text-care-red shrink-0 mt-0.5" />
          <p className="text-[13px] text-care-ink-2 leading-relaxed">
            이 서비스는 병동의 <b className="text-care-ink">공기질·감염 위험을 선제적으로 관리</b>하는 상태를 보여드립니다. 의료 진단이 아니며, 모든 조치 이력은 병원 감염관리 증빙으로 자동 기록됩니다.
          </p>
        </Card>
      </section>

      <button onClick={() => setConfirm(true)} className="care-btn mx-4 mt-5 bg-care-card text-care-ink-2 text-[15px] flex items-center justify-center gap-2" style={{ boxShadow: "var(--care-shadow)" }}>
        <LogOut size={18} /> 로그아웃
      </button>

      <p className="mt-5 text-[12px] text-care-ink-3 text-center">LG ThinQ 케어 · v1.0 · 시연용 데모</p>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-care-ink text-care-bg text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg care-enter">
          {toast}
        </div>
      )}

      {/* 로그아웃 확인 */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 care-enter" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-[430px] bg-care-card rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-extrabold text-care-ink text-center">로그아웃하시겠어요?</p>
            <p className="text-[13px] text-care-ink-2 text-center mt-2">다시 이용하려면 병원 초대 정보로 재입장해야 합니다.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirm(false)} className="care-btn flex-1 bg-zinc-100 dark:bg-zinc-800 text-care-ink-2 text-[15px]">취소</button>
              <button onClick={logout} className="care-btn flex-1 bg-care-red text-white text-[15px]">로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
