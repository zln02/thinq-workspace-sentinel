"use client";
// 보호자 앱 첫 화면 — 풀스크린 일러스트 스플래시. 탭하면 입장.
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/guardian";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function Splash() {
  const router = useRouter();

  const enter = () => {
    if (!getSession()) {
      setSession({
        guardian: "보호자",
        patient: "김복순 어르신",
        room: "201호 다인실",
        space_id: "ward_a", // 데모 연동 공간(실센서 병동)
      });
    }
    router.replace("/guardian/home");
  };

  return (
    <button
      type="button"
      onClick={enter}
      aria-label="탭하여 로그인"
      className="relative block w-full min-h-screen overflow-hidden text-left select-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 배경 일러스트 (요양 거실 — 어르신 + 가전) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${BASE}/guardian-hero.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />

      {/* 상·하단 가독성용 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40 pointer-events-none" />

      {/* 로고 (흰색) — 중앙보다 살짝 아래 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-[6vh] px-6 pointer-events-none">
        <div className="flex items-baseline gap-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          <span className="text-white font-extrabold tracking-tight text-[28px] leading-none">ThinQ</span>
          <span className="text-white/95 font-semibold tracking-[0.3em] text-[22px] leading-none">SENTINEL</span>
        </div>
        <p className="mt-3 text-white/90 text-[13px] font-semibold tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
          가족 안심 케어 · 실시간 감염관리
        </p>
      </div>

      {/* 하단 중앙: 탭하여 로그인 (깜빡 + 위아래 살짝 움직임) */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-[calc(env(safe-area-inset-bottom)+2.8rem)] px-6 pointer-events-none">
        <span className="tap-blink text-white font-extrabold text-[18px] tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          화면을 탭하여 로그인
        </span>
        <span className="tap-dot mt-2 block w-1.5 h-1.5 rounded-full bg-white/90 shadow" />
      </div>

      <style jsx>{`
        @keyframes tapBlink {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.2; transform: translateY(4px); }
        }
        @keyframes tapDot {
          0%, 100% { opacity: 0.9; transform: translateY(0); }
          50% { opacity: 0.2; transform: translateY(6px); }
        }
        .tap-blink { animation: tapBlink 1.4s ease-in-out infinite; }
        .tap-dot { animation: tapDot 1.4s ease-in-out infinite; }
      `}</style>
    </button>
  );
}
