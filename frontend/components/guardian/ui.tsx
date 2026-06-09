// 보호자 앱 공유 UI — LG ThinQ 5.0 디자인 언어(화이트 베이스·soft shadow·Active Red 포인트)
// 화면마다 복붙되던 헤더/카드를 단일화. 색은 globals.css 토큰(var(--care-*)) 사용.
"use client";
import { ReactNode } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

/** 화이트 헤더 — 상단 safe-area(노치) 자동 회피. 좌측 큰 제목 + 보조문구 + 우측 슬롯 */
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header
      className="px-5 pb-3 bg-[var(--care-card)]/85 backdrop-blur-xl sticky top-0 z-20 border-b border-[var(--care-line)]"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.875rem)" }}
    >
      <div className="flex items-end justify-between">
        <div>
          {subtitle && <p className="text-[13px] font-semibold text-care-red leading-tight">{subtitle}</p>}
          <h1 className="text-[22px] font-extrabold tracking-tight text-care-ink leading-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

/** ThinQ 카드 — 보더 없이 soft shadow로 부상 */
export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`care-card ${className}`} style={style}>
      {children}
    </div>
  );
}

/** 섹션 소제목 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-bold text-care-ink-2 mb-2.5 ml-1">{children}</h2>;
}

/** pill primary 버튼 (Active Red) */
export function PrimaryButton({ children, onClick, type = "button", className = "" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; className?: string }) {
  return (
    <button type={type} onClick={onClick} className={`care-btn w-full bg-care-red text-white text-[16px] flex items-center justify-center gap-1.5 ${className}`}>
      {children}
    </button>
  );
}

/** 연결 끊김/오래된 데이터 경고 배너 — stale 시 표시 (P0: 잘못된 '안전' 신뢰 방지) */
export function ConnectionBanner({ connected, lastTs }: { connected: boolean; lastTs: number | null }) {
  if (connected) return null;
  const sec = lastTs ? Math.round((Date.now() - lastTs) / 1000) : null;
  const never = lastTs == null;
  return (
    <div className="mx-4 mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-3 flex items-start gap-2.5 care-enter">
      {never ? <WifiOff size={18} className="text-amber-600 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />}
      <div className="text-[13px] leading-snug">
        <b className="text-amber-800 dark:text-amber-300">{never ? "실시간 데이터를 불러오는 중" : "실시간 연결이 끊겼습니다"}</b>
        <p className="text-amber-700/90 dark:text-amber-400/90 mt-0.5">
          {never ? "잠시만 기다려 주세요." : `아래 정보는 ${sec != null ? (sec < 60 ? `${sec}초 전` : `${Math.floor(sec / 60)}분 전`) : "마지막"} 기준입니다. 자동으로 다시 연결합니다.`}
        </p>
      </div>
    </div>
  );
}

/** 스켈레톤 블록 — 첫 진입 레이아웃 시프트 방지 (P0) */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`care-skeleton ${className}`} />;
}
