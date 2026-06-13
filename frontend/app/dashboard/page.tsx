// frontend/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, LogOut, Clock, Users, AlertTriangle, HeartPulse, FileText, 
  ActivitySquare, CheckCircle2, Zap, BatteryCharging, Wrench, TrendingDown, 
  X, Check, AlertCircle, Activity, TrendingUp, DownloadCloud, Leaf, Wind, Thermometer, Power, Radio
} from "lucide-react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, LineChart, ReferenceLine
} from 'recharts';
import { FloorPlan, type SpaceCard } from "@/components/domain/FloorPlan";
import { useLiveWard, useSpacesOverview, useReport, useExternalSignal, useExternalMeta, useCowayStatus, useAcStatus, useControlPlan, sendControl, sendApprove, selectRegion, clearRegion, useBoostState, setControlMode, useControlMode, useSensorSeries, type SpaceOverview, type DirectorReport } from "@/lib/useSentinel";
import FlowPanel from "@/components/domain/FlowPanel";
import { getSession, canAccess, clearSession } from "@/lib/auth";
import { tierRank, autoResponse } from "@/lib/wardData";

// ============================================================================
// 🧱 재사용 컴포넌트: 모달 껍데기 (스크롤바 숨김 적용)
// ============================================================================
function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition bg-slate-100 p-2 rounded-full"><X size={20} /></button>
        </div>
        {/* 💡 스크롤바 숨김 적용 */}
        <div className="p-8 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// 🔧 시설관리자 전용: 호실별 가전 맵 컴포넌트
// ============================================================================
function FMFloorPlan({ spaces }: { spaces: SpaceOverview[] }) {
  const [sel, setSel] = useState<SpaceOverview | null>(null);
  const plan = useControlPlan(sel?.space_id ?? "ward_a", sel?.tier ?? null);
  const tcls = (t: string) => DIR_TIER[t] ?? { ko: t, cls: "bg-slate-100 text-slate-600" };
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {spaces.map((s) => {
          const t = tcls(s.tier);
          const isLive = s.source === "실센서";
          const hot = tierRank(s.tier) >= 2;
          return (
            <div key={s.space_id} onClick={() => setSel(s)}
              className={`p-4 rounded-2xl bg-white cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all flex flex-col border border-slate-200 ${hot ? "border-l-4 border-l-[#7a0024]" : ""}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-lg text-slate-900">{s.space_name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isLive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{isLive ? "실센서 LIVE" : "시뮬"}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.cls}`}>{t.ko}</span>
                <span className="text-xs text-slate-500">PoI {s.poi != null ? (s.poi * 100).toFixed(0) : "—"}%</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 mt-auto">
                <span>CO₂ {s.co2_ppm ?? "—"}<span className="text-slate-400">ppm</span></span>
                <span>PM2.5 {s.pm25 ?? "—"}</span>
                <span>{s.temp_c != null ? s.temp_c.toFixed(1) : "—"}°C</span>
                <span>습도 {s.humidity != null ? s.humidity.toFixed(0) : "—"}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <Modal title={`🔌 ${sel.space_name} 제어 계획 (control-plan)`} onClose={() => setSel(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <p className="text-sm text-slate-400">현재 위험 등급</p>
                <p className="font-bold text-slate-900">{DIR_TIER[sel.tier]?.ko ?? sel.tier} · PoI {sel.poi != null ? (sel.poi * 100).toFixed(1) : "—"}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">병원체 · 계절</p>
                <p className="font-bold text-slate-900">{plan?.pathogen ?? "—"} · {plan?.season ?? "—"}</p>
              </div>
            </div>
            <h4 className="text-sm font-bold text-slate-600">적용 가전 (자동 세팅)</h4>
            {plan?.applied?.length ? plan.applied.map((d, i) => (
              <div key={i} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between bg-emerald-50/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700"><Wind size={16} /></div>
                  <div>
                    <p className="font-bold text-slate-900">{d.name_kr}</p>
                    <p className="text-xs text-slate-400">{d.reason}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 text-white">{d.setting ?? "가동"}</span>
              </div>
            )) : <p className="text-sm text-slate-400">현재 등급에서는 자동 가동 대상 가전이 없습니다 (대기).</p>}
            {plan?.skipped?.length ? (
              <p className="text-xs text-slate-400">대기: {plan.skipped.map((d) => d.name_kr).join(", ")}</p>
            ) : null}
            {plan?.rationale && <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">근거: {plan.rationale}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// 🧭 좌측 사이드바 네비 (Stitch v2 · Material Symbols) — SUPER 는 뷰 전환
// ============================================================================
const ROLE_META: Record<string, { label: string; icon: string }> = {
  NURSE: { label: "간호사 관제", icon: "monitor_heart" },
  FM: { label: "시설·가전 제어", icon: "account_tree" },
  DIRECTOR: { label: "경영 리포트", icon: "analytics" },
};
const NAV: { role: string; label: string; desc: string; icon: string; href?: string }[] = [
  { role: "NURSE", label: "간호사 관제", desc: "실시간 병동 감시", icon: "monitor_heart" },
  { role: "FM", label: "시설·가전 제어", desc: "ThinQ 자동 방역", icon: "account_tree" },
  { role: "DIRECTOR", label: "경영 리포트", desc: "ESG·ROI 증빙", icon: "analytics" },
  { role: "GUARDIAN", label: "보호자 앱", desc: "가족 안심", icon: "family_home", href: "/guardian" },
];

function DashSidebar({ role, account, userName, onSelect, onLogout, open, onClose }: {
  role: string; account: string | null; userName: string | null;
  onSelect: (r: string, href?: string) => void; onLogout: () => void;
  open: boolean; onClose: () => void;
}) {
  const isSuper = account === "SUPER";
  const items = isSuper ? NAV : NAV.filter((n) => n.role === role);
  return (
    <>
    {/* 모바일 드로어 백드롭 */}
    {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />}
    <nav className={`flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7a0024] text-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined fill">coronavirus</span></div>
        <div>
          <h1 className="text-base font-black text-[#7a0024] leading-tight">ThinQ Sentinel</h1>
          <p className="text-[11px] text-slate-400">감염관리 통합 관제</p>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isSuper && <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">대시보드</p>}
        {items.map((n) => {
          const active = role === n.role && !n.href;
          return (
            <button key={n.role} onClick={() => { onSelect(n.role, n.href); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${active ? "bg-[#fff0f0] text-[#7a0024] font-bold" : "text-slate-500 hover:bg-slate-50 hover:translate-x-0.5"}`}>
              <span className={`material-symbols-outlined ${active ? "fill" : ""}`}>{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-tight">{n.label}</p>
                <p className="text-[11px] text-slate-400 font-normal truncate">{n.desc}</p>
              </div>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-[#7a0024]" />}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-[20px]">person</span></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
            <p className="text-[11px] text-slate-400">{isSuper ? "통합관리자 · 전체 열람" : ROLE_META[role]?.label}</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-[#7a0024] transition-colors">
          <span className="material-symbols-outlined text-[18px]">logout</span> 로그아웃
        </button>
      </div>
    </nav>
    </>
  );
}

// ============================================================================
// 🚀 메인 대시보드 컴포넌트
// ============================================================================
export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);   // 모바일 드로어
  // 201호 실센서 SSE — 헤더 전역 LIVE 인디케이터용(영상에서 실데이터 가동 상시 노출)
  const { data: live, connected: liveConnected } = useLiveWard("ward_a");

  useEffect(() => {
    // 권한 가드 — 미로그인/타권한 접근 시 로그인으로. SUPER 는 전체 허용.
    const s = getSession();
    if (!canAccess(s, ["NURSE", "FM", "DIRECTOR"])) { router.replace("/"); return; }
    const viewRole = ["NURSE", "FM", "DIRECTOR"].includes(s!.role) ? s!.role : "NURSE";
    setRole(viewRole);
    setAccount(s!.account);
    setUserName(s!.name || "수간호사");

    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const handleLogout = () => { clearSession(); router.push("/"); };
  const selectView = (r: string, href?: string) => {
    if (href) { router.push(href); return; }
    localStorage.setItem("role", r); // SUPER 뷰 전환 (account 유지)
    setRole(r);
  };

  if (!role) return null;
  const meta = ROLE_META[role] ?? ROLE_META.NURSE;

  return (
    <div className="min-h-screen bg-[#F3F7FB] text-slate-700 flex font-sans">
      <DashSidebar role={role} account={account} userName={userName} onSelect={selectView} onLogout={handleLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
        {/* 슬림 톱바 */}
        <header className="bg-white border-b border-slate-200 px-5 sm:px-6 h-16 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} aria-label="메뉴 열기"
              className="md:hidden -ml-1 w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="material-symbols-outlined text-[#7a0024]">{meta.icon}</span>
            <h2 className="text-lg font-bold text-slate-900 truncate">{meta.label}</h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {role === "DIRECTOR" && (
              <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-emerald-700 text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">verified</span> 법정 컴플라이언스 100%
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${liveConnected ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-100 border-slate-300 text-slate-500"}`}>
              <span className="relative flex h-2 w-2">
                {liveConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${liveConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
              </span>
              201호 {liveConnected ? `LIVE · ${live?.tier ?? "···"}` : "연결중"}
            </div>
            <span className="hidden md:flex items-center gap-1.5 text-slate-500 text-sm font-medium">
              <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>{time}
            </span>
          </div>
        </header>

        <div className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {role === "NURSE" && <NurseView />}
          {role === "FM" && <FMView />}
          {role === "DIRECTOR" && <DirectorView />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🦠 외부 감염병 조기경보 배너 (질병청·UIS 연동) — "외부 예측 → 선제 예방" 차별점
// ============================================================================
const DISEASE_KR: Record<string, string> = { influenza: "인플루엔자", covid: "코로나19", covid19: "코로나19", rsv: "RSV", norovirus: "노로바이러스" };
const LV_STYLE: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  GREEN: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "평온" },
  YELLOW: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "주의" },
  ORANGE: { dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "경계" },
  RED: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-200", label: "심각" },
};

function ExternalForecastBanner() {
  const regions = useExternalSignal(60000);
  const meta = useExternalMeta(60000);   // 최종 데이터 기준일·출처기관
  const boost = useBoostState(4000);     // 현재 외부 boost 상태(시연 토글 ON/OFF 표시)
  const [myRegion, setMyRegion] = useState<string>("");
  useEffect(() => { setMyRegion(getSession()?.region ?? ""); }, []);
  if (!regions.length) return null;
  // 로그인 병원의 지역 신호만 표시(지역 고정). 못 찾으면 전국 최고위험으로 폴백.
  const top = regions.find((r) => r.region === myRegion)
    ?? [...regions].sort((a, b) => (b.live_score ?? 0) - (a.live_score ?? 0))[0];
  const st = LV_STYLE[top.live_level] ?? LV_STYLE.GREEN;
  const disease = DISEASE_KR[top.disease] ?? top.disease;
  const peak = top.conf_peak_date ? `${Number(top.conf_peak_date.slice(5, 7))}월 ${Number(top.conf_peak_date.slice(8, 10))}일` : "-";
  // 외부 boost 발령 중 여부 — 발령 중이면 배너를 빨강 톤으로 전환하고 "선제 상향 중" 명시.
  const boostOn = !!boost && !!boost.boost_tier && boost.boost_tier !== "MONITOR";
  const boostRegion = boost?.region ?? top.region;
  const wrapCls = boostOn ? "bg-red-50 border-red-300 ring-1 ring-[#7a0024]/30" : st.bg;
  return (
    <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 ${wrapCls}`}>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl">🦠</span>
        <div>
          <p className="text-[11px] font-bold text-slate-500">외부 감염병 조기경보 · {meta.source ?? "질병관리청·UIS"}{meta.as_of ? ` · 기준 ${meta.as_of}` : ""}</p>
          <p className={`text-sm font-black ${boostOn ? "text-[#7a0024]" : st.text}`}>{top.region} {disease} <span>{st.label}({top.live_score ?? "—"})</span></p>
        </div>
      </div>
      <div className="hidden sm:block h-9 w-px bg-slate-200" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-bold">📈 유행 피크 예측 {peak}{top.lead_days != null && top.lead_days > 0 ? <span className="text-[#7a0024]"> · D-{top.lead_days} 선행 경보</span> : null}</p>
        {boostOn
          ? <p className="text-xs text-[#7a0024] font-bold mt-0.5">🔴 외부 조기경보 발령 → 전 병동 <b>선제 위험상향({boost?.boost_tier}) 자동 가동 중</b> · {boostRegion}발</p>
          : <p className="text-xs text-slate-500 mt-0.5">예측 위험 도달 시 ThinQ가 전 병동 <b className="text-slate-700">선제 환기·정화 자동 강화</b> · 전국 {regions.length}개 지역 실시간 감시</p>}
        {/* 다층 외부 데이터 출처 — "우리가 빌려오는 데이터의 풍부함" 부각 */}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <span className="text-[10px] font-bold text-slate-400 mr-0.5">수집원</span>
          {["질병청 확진", "하수 KOWAS", "검색 데이터랩", "약국 OTC", "기온 KMA"].map((s) => (
            <span key={s} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-slate-600 border border-slate-300/60">{s}</span>
          ))}
        </div>
      </div>
      {/* 시연 토글 — 외부 조기경보 발령 재현(replay) ⇄ 해제. 외부데이터→실내 인과를 라이브로 시연 */}
      <button
        onClick={() => (boostOn ? clearRegion() : selectRegion(top.region, "replay"))}
        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
          boostOn ? "bg-[#7a0024] text-white border-[#7a0024] hover:bg-[#5e001b]"
                  : "bg-white text-[#7a0024] border-[#7a0024]/40 hover:border-[#7a0024]"}`}
      >
        {boostOn ? "■ 선제 발령 해제" : "▶ 선제 시나리오 발령"}
      </button>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${boostOn ? "bg-red-500" : st.dot} opacity-60`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${boostOn ? "bg-red-500" : st.dot}`} />
      </span>
    </div>
  );
}

// 외부 경보등급 → 가전 차등제어 상관 패널 — "항상 최대가 아니라 위험도 비례" 차별점 증명
function ExternalControlMap() {
  const boost = useBoostState(4000);
  const lv = boost?.boost_tier ?? "MONITOR";
  const active = lv === "MONITOR" ? 0 : lv === "CAUTION" ? 1 : (lv === "ALERT" || lv === "HIGH_RISK") ? 2 : 3;
  const rows = [
    { ext: "🟢 정상 (GREEN)", resp: "평상 감시", dev: "가전 대기 · 에너지 절약", on: "ring-emerald-400 bg-emerald-50" },
    { ext: "🟡🟠 주의·경계 (YELLOW/ORANGE)", resp: "선제 약(弱)대응", dev: "공기청정 LOW 자동 가동", on: "ring-amber-400 bg-amber-50" },
    { ext: "🔴 심각 (RED)", resp: "선제 강(强)대응", dev: "공청 TURBO + 에어컨 송풍 환기", on: "ring-red-400 bg-red-50" },
    { ext: "⚫ 위급 (내부 CRITICAL)", resp: "관리자 승인 후 최대", dev: "전 병동 터보 · 승인 거버넌스", on: "ring-rose-500 bg-rose-50" },
  ];
  return (
    <div className="bg-violet-50/40 border border-violet-200 border-l-4 border-l-violet-500 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><Zap size={15} className="text-violet-600" /></div>
        <h3 className="text-base font-bold text-slate-900">외부 경보 → ThinQ 가전 차등 자동제어</h3>
        <span className="text-[11px] font-bold text-slate-400">위험도에 비례 — 항상 최대로 돌리지 않음(에너지·과대응 방지)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-3">
        {rows.map((r, i) => (
          <div key={i} className={`rounded-xl border border-slate-200 p-3 transition-all ${i === active ? `ring-2 ${r.on}` : "bg-slate-50/50 opacity-70"}`}>
            <p className="text-xs font-black text-slate-800">{r.ext}</p>
            <p className="text-[11px] text-slate-500 mt-1">{r.resp}</p>
            <p className="text-[11px] font-bold text-slate-700 mt-1.5 leading-snug">{r.dev}</p>
            {i === active && <p className="text-[10px] font-bold text-[#7a0024] mt-1.5">● 현재 적용 중</p>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">↳ 병원체마다 최적 환경이 다름(인플루엔자 가습 50%RH ↔ 노로 제습 45% — <b className="text-slate-600">정반대</b>). 그래서 「무엇이 유행하는지」를 알아야 환경을 정하고, 위험할 때만 그 환경을 만든다.</p>
    </div>
  );
}

// ============================================================================
// 👩‍⚕️ 1. 간호사(ICN) 대시보드
// ============================================================================
function NurseView() {
  const [modal, setModal] = useState<"DANGER" | null>(null);
  // 백엔드 overview(전 공간) + 201호 SSE 병합 → 환경 관제·자동대응이 라이브로 움직임
  const ov = useSpacesOverview(5000);
  const { data: live } = useLiveWard("ward_a");
  const spaces: SpaceCard[] = ov.map((s) => {
    const isLive = s.source === "실센서";
    const snapshot = isLive && live
      ? { tier: live.tier ?? s.tier, poi: live.poi ?? s.poi, co2: live.co2_ppm ?? s.co2_ppm, temp_c: live.temp_c ?? s.temp_c, rh: live.humidity ?? s.humidity, pm25: live.pm25 ?? s.pm25 }
      : { tier: s.tier, poi: s.poi, co2: s.co2_ppm, temp_c: s.temp_c, rh: s.humidity, pm25: s.pm25 };
    return { space_id: s.space_id, space_name: s.space_name, space_type: s.space_type, max_occupancy: s.max_occupancy, isLive, occ: isLive ? (live?.occupancy ?? null) : null, snapshot };
  });
  // 공간별 tier 출처(센서발/외부 조기경보발) — "이 병동이 왜 위험단계인가"를 카드에 표시.
  const srcMap = new Map(ov.map((s) => [s.space_id, s.tier_source]));
  const atRisk = spaces
    .filter((s) => tierRank(s.snapshot.tier) >= 1) // CAUTION+
    .sort((a, b) => tierRank(b.snapshot.tier) - tierRank(a.snapshot.tier));
  const responding = spaces
    .filter((s) => tierRank(s.snapshot.tier) >= 2) // ALERT+ → ThinQ 자동대응
    .sort((a, b) => tierRank(b.snapshot.tier) - tierRank(a.snapshot.tier));

  const devIcon = (t: string) =>
    t === "vent" ? <Activity size={13} /> : t === "ac" ? <Thermometer size={13} /> : <Wind size={13} />;
  const liveTier = spaces.find((s) => s.isLive)?.snapshot.tier ?? "···";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 외부 감염병 조기경보 — 외부 예측 → 선제 예방 차별점 */}
      <ExternalForecastBanner />

      {/* 외부 경보 → 가전 차등제어 상관 (반박 방어: "항상 최대" 아님) */}
      <ExternalControlMap />

      {/* 상단 KPI — 환경·감염·ThinQ 자동대응 중심 (백엔드 라이브) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-4 border-t-[3px] border-t-blue-500">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Activity size={20} /></div>
          <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">실시간 감시 공간</p><div className="text-2xl font-black text-slate-900">{spaces.length}<span className="text-xs text-slate-400 ml-1 font-normal">개</span></div></div>
        </div>
        <div onClick={() => setModal("DANGER")} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:bg-red-50/40 transition group border-t-[3px] border-t-[#7a0024]">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-[#7a0024] shrink-0"><AlertTriangle size={20} /></div>
          <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-hover:text-[#7a0024] transition-colors">주의·위험 공간</p><div className="text-2xl font-black text-slate-900">{atRisk.length}<span className="text-xs text-slate-400 ml-1 font-normal">개소</span></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-4 border-t-[3px] border-t-emerald-500">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Radio size={20} /></div>
          <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">201호 실센서 <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /></p><div className="text-xl font-black text-slate-900">{liveTier}</div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-4 border-t-[3px] border-t-emerald-500">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Zap size={20} /></div>
          <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">ThinQ 자동대응</p><div className="text-2xl font-black text-slate-900">{responding.length}<span className="text-xs text-slate-400 ml-1 font-normal">개소 가동</span></div></div>
        </div>
      </div>

      {/* 메인: 병동 환경 관제맵 + ThinQ 자동대응 라이브 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-blue-50/30 border border-blue-200 border-l-4 border-l-blue-500 rounded-2xl p-4 space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Wind className="text-blue-600" size={18} /></span> 병동 환경 관제맵 <span className="text-xs font-normal text-slate-500">· 백엔드 라이브 · CO₂ → AI 5-Tier</span></h3>
          <FloorPlan spaces={spaces} />
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-full flex flex-col border-t-[3px] border-t-emerald-500">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1"><Zap className="text-emerald-600" size={18} /> ThinQ 자동대응 라이브</h3>
            <p className="text-[11px] text-slate-500 mb-4">위험 감지 시 가전이 자동 가동됩니다</p>
            <div className="space-y-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {responding.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={28} />전 공간 안정<br />자동대응 대기중</div>
              ) : responding.map((s) => {
                const tier = s.snapshot.tier;
                const isCrit = tierRank(tier) >= 4;
                return (
                  <div key={s.space_id} className={`rounded-xl border p-3 ${isCrit ? "bg-[#7a0024]/[0.06] border-[#7a0024]/30" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-sm truncate">{s.space_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${isCrit ? "bg-[#7a0024] text-white" : "bg-orange-100 text-orange-700"}`}>{tier}</span>
                    </div>
                    {/* 위험단계 출처 — 외부 조기경보로 선제 상향된 공간을 명시(센서 정상이어도 외부발 가동) */}
                    <span className={`inline-flex items-center gap-1 mb-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      srcMap.get(s.space_id) === "external"
                        ? "bg-[#7a0024]/10 text-[#7a0024] border border-[#7a0024]/30"
                        : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                      {srcMap.get(s.space_id) === "external" ? "🦠 외부 조기경보 상향" : "📟 실내센서 감지"}
                    </span>
                    <div className="space-y-1.5">
                      {autoResponse(tier).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                          <span className="text-emerald-600 shrink-0">{devIcon(d.type)}</span>
                          <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                          <span className="text-emerald-700 font-bold shrink-0">{d.mode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 수간호사 인수인계 (축소) */}
      <div className="bg-amber-50/40 border border-amber-200 border-l-4 border-l-amber-400 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><FileText className="text-amber-600" size={15} /></span> 수간호사 인수인계</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">오늘 08:00 작성</p>
            <p className="text-sm text-red-700 font-medium leading-relaxed">🚨 환경 악화 공간 ThinQ 환기 자동가동 중. 오전 회진 시 확인 요망.</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">오늘 07:30 작성</p>
            <p className="text-sm text-slate-700 leading-relaxed">공용식당 식사시간 밀집 모니터링 — 환기 강화 권고.</p>
          </div>
        </div>
      </div>

      {modal === "DANGER" && (
        <Modal title="🚨 주의·위험 공간 + ThinQ 자동대응 현황" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {atRisk.map((s) => {
              const tier = s.snapshot.tier;
              const devs = autoResponse(tier);
              const isCrit = tierRank(tier) >= 3;
              return (
                <div key={s.space_id} className={`p-5 border rounded-xl ${isCrit ? "border-[#7a0024]/40 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`text-xl font-bold ${isCrit ? "text-[#7a0024]" : "text-orange-600"}`}>{s.space_name} <span className="text-sm font-normal">({tier})</span></h4>
                      <p className="text-sm text-slate-600 mt-1">CO₂ {s.snapshot.co2 ?? "—"}ppm · 습도 {s.snapshot.rh != null ? s.snapshot.rh.toFixed(0) : "—"}% · 감염확률 {s.snapshot.poi != null ? (s.snapshot.poi * 100).toFixed(1) : "—"}%</p>
                    </div>
                    <span className={`px-3 py-1.5 text-white text-xs font-bold rounded-full shadow-sm ${isCrit ? "bg-[#7a0024]" : "bg-orange-600"}`}>{isCrit ? "즉각 조치" : "주의 관찰"}</span>
                  </div>
                  {devs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1"><Zap size={12} /> ThinQ 자동가동:</span>
                      {devs.map((d, i) => (<span key={i} className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{d.name} · {d.mode}</span>))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

// 호실별 실시간 환경 시계열 — FM 콘솔에 흡수. 현재 온·습도 라이브(CO2 센서 교체 중→복구 시 라인 추가).
function RoomEnvChart({ spaceId, spaceName }: { spaceId: string; spaceName?: string }) {
  const { source, points } = useSensorSeries(spaceId, 5000);
  const isReal = source === "실측";
  const latest = points.length ? points[points.length - 1] : null;
  const hasCo2 = points.some((p) => p.co2 != null);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-cyan-500 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[360px] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center"><Activity size={15} className="text-cyan-600" /></span>
          {spaceName ?? "선택 공간"} 실시간 환경 — 온·습도
        </h3>
        <div className="flex items-center gap-2">
          {latest?.temp != null && <span className="text-sm font-black text-red-500">{latest.temp}<span className="text-xs font-normal text-slate-400 ml-0.5">°C</span></span>}
          {latest?.rh != null && <span className="text-sm font-black text-blue-500">{latest.rh}<span className="text-xs font-normal text-slate-400 ml-0.5">%</span></span>}
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${isReal ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{isReal ? "● 실측 라이브" : "○ 시뮬(센서 미가동)"}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">최근 30분 · 분단위 · 적정 습도 40–60%(ASHRAE){hasCo2 ? "" : " · CO₂ 센서 교체 중"}</p>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="t" stroke="#94A3B8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis yAxisId="temp" stroke="#ef4444" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[16, 32]} width={34} />
            <YAxis yAxisId="rh" orientation="right" stroke="#3b82f6" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[20, 80]} width={34} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB" }} />
            <ReferenceLine yAxisId="rh" y={60} stroke="#93c5fd" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="rh" y={40} stroke="#93c5fd" strokeDasharray="4 4" />
            <Line yAxisId="temp" type="monotone" dataKey="temp" name="온도(°C)" stroke="#ef4444" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="rh" type="monotone" dataKey="rh" name="습도(%)" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// 🔧 2. 시설관리자(FM) 대시보드
// ============================================================================
function FMView() {
  const spaces = useSpacesOverview(5000);
  const coway = useCowayStatus(8000);
  const ac = useAcStatus(10000);
  const report = useReport(30);
  const { data: live } = useLiveWard("ward_a");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 제어 대상 호실 선택 (기본: 201호 실센서). 실센서 공간은 제어키 "ward_a"(브릿지 적재 키)로 매핑.
  const [selId, setSelId] = useState<string>("");
  useEffect(() => {
    if (!selId && spaces.length) setSelId((spaces.find((s) => s.source === "실센서") ?? spaces[0]).space_id);
  }, [spaces, selId]);
  const sel = spaces.find((s) => s.space_id === selId) ?? null;
  const ctrlKey = sel?.source === "실센서" ? "ward_a" : (sel?.space_id ?? "ward_a");
  const mode = useControlMode(ctrlKey);

  // 자동/수동 모드 전환 — 관리자 비밀번호 모달
  const [pwModal, setPwModal] = useState<null | "auto" | "manual">(null);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const submitMode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwModal) return;
    setPwBusy(true); setPwErr("");
    const res = await setControlMode(ctrlKey, pwModal, pw);
    setPwBusy(false);
    if (res?.ok) {
      setToast(`${pwModal === "manual" ? "수동" : "자동"} 모드로 전환됨`);
      setTimeout(() => setToast(null), 2400);
      setPwModal(null); setPw("");
    } else {
      setPwErr(res?.reason ?? "전환 실패");
    }
  };

  const responding = spaces.filter((s) => tierRank(s.tier) >= 2);
  const c = coway as Record<string, unknown> | null;
  const a = ac as Record<string, unknown> | null;
  const cowayAvail = !!c && c.available !== false;
  const cowayOn = c?.is_on === true;
  const cowayPower = c?.power_est_w as number | undefined;
  const cowayMode = cowayOn ? (c?.rapid_mode ? "급속(터보)" : c?.auto_mode ? "자동" : "가동") : "대기";
  const acAvail = !!a && a.available !== false;
  const acOn = a?.is_on === true;
  const governance = live?.governance ?? "none";
  const approvalNeeded = live?.approval_required === true;
  const govLabel: Record<string, string> = { none: "대기", auto: "AI 자동제어(강)", auto_gentle: "AI 선제 약대응", approval_required: "관리자 승인 대기", approved: "승인 실행", auto_restore: "정상 복귀" };

  const act = async (action: string, label: string) => {
    setBusy(action);
    await sendControl(action, ctrlKey);
    setBusy(null);
    setToast(`[${sel?.space_name ?? ctrlKey}] ${label} 명령 전송됨`);
    setTimeout(() => setToast(null), 2400);
  };
  const approve = async () => {
    setBusy("approve");
    await sendApprove("ward_a");
    setBusy(null);
    setToast("고위험 제어 승인됨");
    setTimeout(() => setToast(null), 2400);
  };

  const fmDeviceRiskData = [
    { name: '1일', 평균위험도: 12, 제어건수: 24 }, { name: '2일', 평균위험도: 15, 제어건수: 41 },
    { name: '3일', 평균위험도: 28, 제어건수: 76 }, { name: '4일', 평균위험도: 18, 제어건수: 32 },
    { name: '5일', 평균위험도: 10, 제어건수: 18 }, { name: '6일', 평균위험도: 14, 제어건수: 29 },
  ];

  const Btn = ({ a: action, label, kind }: { a: string; label: string; kind?: "p" | "d" | "n" }) => (
    <button onClick={() => act(action, label)} disabled={busy !== null}
      className={`px-3 py-2 rounded-lg text-sm font-bold transition active:scale-95 disabled:opacity-50 ${
        kind === "p" ? "bg-[#7a0024] text-white hover:bg-[#92002c]" :
        kind === "d" ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200" :
        "bg-blue-600 text-white hover:bg-blue-500"}`}>
      {busy === action ? "전송중…" : label}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI — 실데이터 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-[#7a0024] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="kpi-label mb-1">실시간 감시 공간</p>
          <div className="kpi-value">{spaces.length}<span className="text-sm font-normal text-slate-400 ml-1">개</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-orange-500 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="kpi-label mb-1">ThinQ 자동대응 가동</p>
          <div className="kpi-value">{responding.length}<span className="text-sm font-normal text-slate-400 ml-1">개소</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-emerald-500 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="kpi-label mb-1 flex items-center gap-1">코웨이 공기청정기 {cowayAvail && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}</p>
          <div className="text-2xl font-black text-slate-900">{cowayAvail ? cowayMode : "데모"}<span className="text-xs font-normal text-slate-400 ml-1">{cowayPower != null ? `${cowayPower}W` : ""}</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-blue-500 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="kpi-label mb-1">자동 선제대응(30일)</p>
          <div className="kpi-value">{report ? report.auto_actions.toLocaleString() : "—"}<span className="text-sm font-normal text-slate-400 ml-1">건</span></div>
        </div>
      </div>

      {/* 실 가전 제어 콘솔 — 키오스크 제어판 흡수 (실제 액추에이션) */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-[#7a0024] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Power size={20} className="text-[#7a0024]" /> 실 가전 제어 콘솔</h3>
          <div className="flex items-center gap-2">
            {/* 자동/수동 모드 — 전환 시 관리자 비밀번호 */}
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${mode === "manual" ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {mode === "manual" ? "🔧 수동 모드" : "🤖 자동 모드"}
            </span>
            <button
              onClick={() => { setPwErr(""); setPw(""); setPwModal(mode === "manual" ? "auto" : "manual"); }}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-300 text-slate-600 hover:border-[#7a0024] hover:text-[#7a0024] transition-colors"
            >
              {mode === "manual" ? "자동으로 전환" : "수동으로 전환"} 🔒
            </button>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${governance === "auto" ? "bg-emerald-50 text-emerald-700" : approvalNeeded ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>거버넌스: {govLabel[governance] ?? governance}</span>
          </div>
        </div>
        {/* 제어 대상 호실 선택 */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <span className="text-xs font-bold text-slate-500">제어 대상</span>
          <select
            value={selId} onChange={(e) => setSelId(e.target.value)}
            className="text-sm font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-[#7a0024]"
          >
            {spaces.map((s) => <option key={s.space_id} value={s.space_id}>{s.space_name}{s.source === "실센서" ? " · 실센서" : ""}</option>)}
          </select>
          {mode === "manual" && <span className="text-[11px] text-amber-600 font-bold">· 수동 모드 — 자동 제어 보류 중</span>}
        </div>
        <p className="text-xs text-slate-400 mb-5">{sel?.space_name ?? "201호"} · 실제 LG ThinQ/SmartThings 가전을 직접 제어합니다</p>

        {approvalNeeded && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
            <p className="text-sm text-red-700 font-bold flex items-center gap-2"><AlertTriangle size={16} /> 고위험(CRITICAL) 제어 승인 대기 중</p>
            <button onClick={approve} disabled={busy !== null} className="px-4 py-2 rounded-lg bg-[#7a0024] text-white text-sm font-bold hover:bg-[#92002c] active:scale-95 disabled:opacity-50">⚠ 고위험 제어 승인</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Wind size={18} /></div><div><p className="font-bold text-slate-900">코웨이 공기청정기</p><p className="text-xs text-slate-400">{cowayAvail ? (cowayOn ? `${cowayMode}${cowayPower != null ? ` · ${cowayPower}W` : ""}` : "전원 대기") : "어댑터 미연동 (데모)"}</p></div></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${cowayOn ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{cowayOn ? "가동중" : "OFF"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn a="on" label="전원 ON" kind="n" />
              <Btn a="off" label="전원 OFF" kind="d" />
              <Btn a="rapid" label="급속" kind="p" />
              <Btn a="auto" label="자동" kind="d" />
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Thermometer size={18} /></div><div><p className="font-bold text-slate-900">시스템 에어컨</p><p className="text-xs text-slate-400">{acAvail ? (acOn ? `${a?.mode ?? "냉방"} ${a?.set_temp ?? ""}℃ · 실내 ${a?.room_temp ?? "—"}℃` : "전원 대기") : "어댑터 미연동 (데모)"}</p></div></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${acOn ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{acOn ? "가동중" : "OFF"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn a="ac_on" label="송풍 환기 ON" kind="n" />
              <Btn a="ac_off" label="전원 OFF" kind="d" />
            </div>
          </div>
        </div>
      </div>

      {/* 호실별 실시간 환경 시계열 — 위 콘솔의 선택 호실과 연동 */}
      <RoomEnvChart spaceId={selId || ctrlKey} spaceName={sel?.space_name} />

      {/* 자동 방역 의사결정 흐름 */}
      <FlowPanel spaceId="ward_a" />

      {/* 일별 추이 차트 (시연) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[360px] flex flex-col">
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600" /> 일별 자동 제어 건수 및 평균 감염 위험도</h3>
        <p className="text-xs text-slate-400 mb-4">ThinQ AI 개입에 따른 위험도 하락 상관관계 (시연 데이터)</p>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fmDeviceRiskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 40]} />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: 'none' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar yAxisId="right" dataKey="제어건수" name="가전 제어 건수 (건)" fill="#3B82F6" barSize={30} radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="평균위험도" name="평균 위험도 (%)" stroke="#7a0024" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 실시간 병동 환경·제어 맵 (실데이터) */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Wind className="text-[#7a0024]" size={20} /> 실시간 병동 환경·제어 맵 <span className="text-xs font-normal text-slate-500">· 백엔드 라이브 · 카드 클릭 시 제어 계획</span></h3>
        <FMFloorPlan spaces={spaces} />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2">{toast}</div>
      )}

      {/* 자동/수동 모드 전환 — 관리자 비밀번호 모달 */}
      {pwModal && (
        <Modal title={`${pwModal === "manual" ? "🔧 수동" : "🤖 자동"} 모드 전환 — 관리자 인증`} onClose={() => setPwModal(null)}>
          <form onSubmit={submitMode} className="space-y-4">
            <p className="text-sm text-slate-600">
              <b className="text-slate-900">{sel?.space_name ?? "대상 공간"}</b> 제어를{" "}
              <b className={pwModal === "manual" ? "text-amber-600" : "text-emerald-600"}>{pwModal === "manual" ? "수동(관리자 직접 제어)" : "자동(AI 차등제어)"}</b> 모드로 전환합니다.
              {pwModal === "manual" && <span className="block text-xs text-amber-600 mt-1">⚠ 수동 모드에서는 외부신호·센서 기반 자동 가동이 보류됩니다.</span>}
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">관리자 비밀번호</label>
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus placeholder="관리자 비밀번호"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7a0024]"
              />
              {pwErr && <p className="text-xs text-red-600 font-bold mt-1.5">{pwErr}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setPwModal(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">취소</button>
              <button type="submit" disabled={pwBusy} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#7a0024] text-white hover:bg-[#92002c] disabled:opacity-50">{pwBusy ? "인증 중…" : "전환"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// 💼 3. 병원장(DIRECTOR) 대시보드
// ============================================================================
// 병원장 뷰 tier 색/라벨 (배지용)
const DIR_TIER: Record<string, { ko: string; cls: string }> = {
  MONITOR: { ko: "정상", cls: "bg-emerald-100 text-emerald-700" },
  CAUTION: { ko: "주의", cls: "bg-amber-100 text-amber-700" },
  ALERT: { ko: "경계", cls: "bg-orange-100 text-orange-700" },
  HIGH_RISK: { ko: "고위험", cls: "bg-red-100 text-red-700" },
  CRITICAL: { ko: "위급", cls: "bg-red-200 text-red-900" },
};
// 법규 준수 자동 증빙 (요양병원 감염관리 의무 ↔ Sentinel 자동 생성 증빙)
const COMPLIANCE = [
  { law: "의료법 제36조", duty: "감염관리위원회 정기 보고", evidence: "제어 이력·알림 자동 PDF", org: "보건복지부" },
  { law: "감염병예방법 제16조", duty: "감염병 발생 시 신고·관리", evidence: "tier 변화 → 보건소 자동 알림", org: "질병관리청" },
  { law: "실내공기질관리법 제5조", duty: "CO₂·PM·HCHO 측정 의무", evidence: "센서 연속 측정 자동 보고", org: "환경부" },
  { law: "요양병원 적정성평가", duty: "감염관리 영역 연 1회 평가", evidence: "자동 증빙 리포트 (수가 가산)", org: "심평원" },
];

// 숫자 카운팅업 애니메이션 (RAF, 무의존) — KPI 진입 시 0→목표값 ease-out
function CountUp({ end, fmt, ms = 900 }: { end: number; fmt?: (n: number) => string; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / ms, 1);
      setV(end * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
      else setV(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, ms]);
  return <>{fmt ? fmt(v) : Math.round(v).toLocaleString()}</>;
}

// 타이핑 효과 — 텍스트를 글자 단위로 드러냄(AI 브리핑 생성 느낌)
function useTypewriter(text: string, charMs = 16) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), charMs);
    return () => clearTimeout(t);
  }, [n, text, charMs]);
  return text.slice(0, n);
}

// 모델 산출값 → 자연어 브리핑(NLG). 생성형 아님 — 실측 지표 조합 자동 요약(정직 라벨).
function buildBriefing(r: DirectorReport | null): string {
  if (!r) return "최근 감염관리 집계를 불러오는 중입니다…";
  const parts: string[] = [];
  parts.push(`최근 ${r.period.days}일간 ${r.spaces_monitored}개 공간에서 ${r.readings.toLocaleString()}건의 환경을 연속 모니터링했습니다.`);
  if (r.max_lead_days && r.preempt_region) {
    const dz = DISEASE_KR[r.preempt_disease ?? ""] ?? r.preempt_disease ?? "감염병";
    parts.push(`외부 조기경보(${r.preempt_region} ${dz})를 확진피크 ${r.max_lead_days}일 전에 포착해, 센서가 정상인 상태에서도 선제 대응 ${(r.preemptive_actions ?? 0).toLocaleString()}건을 자동 가동했습니다.`);
  }
  const poiPct = r.peak_poi * 100;
  parts.push(`기간 최고 감염위험(Wells-Riley PoI)은 ${poiPct.toFixed(1)}%로 CRITICAL 도달 ${r.alert_events}건에 그쳐 안정적으로 관리되었습니다.`);
  const man = r.est_cost_saved_krw >= 10000 ? `약 ${(r.est_cost_saved_krw / 10000).toFixed(0)}만원` : `약 ${(r.est_cost_saved_krw / 1000).toFixed(0)}천원`;
  parts.push(`자동 방역 총 ${r.auto_actions.toLocaleString()}건으로 추정 방역비용 ${man}을 절감했습니다.`);
  parts.push(`권고: ${poiPct >= 4 ? "다인실 환기 주기 단축 및 식사시간 밀집 모니터링을 권고합니다." : "현재 감염위험은 낮은 수준으로, 평상 운영 유지를 권고합니다."}`);
  return parts.join(" ");
}

function AiBriefing({ report }: { report: DirectorReport | null }) {
  const text = useMemo(() => buildBriefing(report), [report]);
  const shown = useTypewriter(text, 14);
  const typing = shown.length < text.length;
  return (
    <div className="rounded-2xl border border-indigo-200 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/60 to-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">✨</span>
        <h3 className="text-base font-bold text-slate-900">AI 자동 브리핑</h3>
        <span className="text-[11px] font-bold text-slate-400">모델 산출값 기반 자동 요약(NLG)</span>
        {typing && <span className="ml-auto text-[11px] font-bold text-indigo-500 animate-pulse">작성 중…</span>}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {shown}<span className={`inline-block w-1.5 ${typing ? "animate-pulse" : "opacity-0"} text-indigo-500`}>▍</span>
      </p>
    </div>
  );
}

function DirectorView() {
  const report = useReport(30);            // 최근 30일 실측 집계 (없으면 null → 로딩/시뮬)
  const spaces = useSpacesOverview();      // 공간별 라이브 위험도
  const isReal = report?.source === "실측";

  const fmtKRW = (won: number) =>
    won >= 10000 ? `${(won / 10000).toFixed(won % 10000 ? 1 : 0)}` : `${(won / 1000).toFixed(0)}`;
  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "—";

  // 비용 비교 차트: 주차별 '실측' 자동대응 → ThinQ 추정비용 vs 수동 방역비용(추정 기준선)
  const MANUAL_WEEKLY_KRW = 1_300_000;      // 추정 기준선: 주당 수동 방역 인건/에너지
  const costData = (report?.weekly?.length
    ? report.weekly
    : [{ week: "1주차", actions: 0, est_saved_krw: 0 }]
  ).map((w) => ({
    name: w.week,
    수동방역비용: Math.round(MANUAL_WEEKLY_KRW / 10000),
    ThinQ자동제어: Math.round(Math.max(MANUAL_WEEKLY_KRW - w.est_saved_krw, 0) / 10000),
  }));

  // 실제 인쇄/저장 가능한 리포트 (브라우저 인쇄 → PDF 저장). 가짜 alert 제거.
  const handlePrintReport = () => window.print();

  // 병원장(구매 결정자) 핵심 KPI — 전부 백엔드 실측 집계 연동.
  // 효능 단정·과장 회피: 유휴(MONITOR)에도 강건한 '활동·기록·최고위험' 지표만 노출.
  const intFmt = (n: number) => Math.round(n).toLocaleString();
  const KPIS = [
    { Icon: Zap, iconCls: "text-amber-600", noteCls: "text-amber-700 bg-amber-50",
      label: "자동 선제대응", num: report ? report.auto_actions : null, fmt: intFmt, unit: "건",
      note: `외부발 ${(report?.preemptive_actions ?? 0).toLocaleString()} + 센서발 ${(report?.sensor_actions ?? 0).toLocaleString()} · 최근 ${report?.period.days ?? 30}일` },
    { Icon: ActivitySquare, iconCls: "text-blue-600", noteCls: "text-blue-700 bg-blue-50",
      label: "연속 모니터링 기록", num: report ? report.readings : null, fmt: intFmt, unit: "건",
      note: `감염관리 증빙 자동 로깅 · ${report?.spaces_monitored ?? 0}개 공간` },
    { Icon: TrendingDown, iconCls: "text-emerald-600", noteCls: "text-emerald-700 bg-emerald-50",
      label: "방역비용 절감(추정)", num: report ? report.est_cost_saved_krw : null, fmt: fmtKRW,
      unit: report && report.est_cost_saved_krw >= 10000 ? "만원" : "천원",
      note: "추정 — 자동대응 1건당 인건·에너지 절감" },
    { Icon: ShieldAlert, iconCls: "text-purple-600", noteCls: "text-purple-700 bg-purple-50",
      label: "기간 최고 감염위험", num: report ? report.peak_poi * 100 : null, fmt: (n: number) => n.toFixed(1), unit: "%",
      note: `Wells-Riley PoI 최고치 · CRITICAL 도달 ${report?.alert_events ?? 0}건` },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">경영 성과 리포트</h2>
          <p className="text-sm text-slate-500 mt-1">
            ThinQ 자동 방역 도입에 따른 감염관리 활동 · 위험 저감 · 증빙
            <span className="ml-2 text-xs font-bold">
              {report
                ? <span className={isReal ? "text-emerald-600" : "text-amber-600"}>
                    ● {isReal ? "실측" : "시뮬"} · {fmtDate(report.period.start)}~{fmtDate(report.period.end)}
                  </span>
                : <span className="text-slate-400">● 집계 불러오는 중…</span>}
            </span>
          </p>
        </div>
        <button
          onClick={handlePrintReport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm border bg-[#7a0024] hover:bg-red-700 text-white border-[#7a0024] print:hidden"
        >
          <DownloadCloud size={18} /> 성과 리포트 인쇄·PDF
        </button>
      </div>

      {/* AI 자동 브리핑 — 모델 산출값 자연어 요약 */}
      <AiBriefing report={report} />

      {/* 🛡️ 감염병 사전예방 성과 — 외부 조기경보 → 선제대응 → 확산 차단 (핵심 차별점) */}
      {report && (report.max_lead_days || report.preemptive_actions) ? (
        <div className="rounded-2xl border border-[#7a0024]/30 bg-gradient-to-r from-[#7a0024]/[0.06] to-transparent p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-[#7a0024]" />
            <h3 className="text-lg font-bold text-slate-900">감염병 <span className="text-[#7a0024]">사전예방</span> 성과</h3>
            <span className="text-[11px] font-bold text-slate-400">사후 대응이 아닌 — 외부 유행을 미리 차단</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ① 외부 선행 포착 — 우리의 진짜 무기 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 mb-1">외부 조기경보 선행 포착</p>
              <p className="text-4xl font-black text-[#7a0024]">{report.max_lead_days ?? "—"}<span className="text-base font-bold text-slate-400 ml-1">일 전</span></p>
              <p className="text-[11px] text-slate-500 mt-1">{report.preempt_region ?? ""} {DISEASE_KR[report.preempt_disease ?? ""] ?? report.preempt_disease ?? ""} 확진피크 전 사전 감지 · 질병청·UIS</p>
            </div>
            {/* ② 선제 대응 — 센서 정상에도 미리 가동 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 mb-1">선제 자동대응 <span className="text-[#7a0024]">(센서 정상에도)</span></p>
              <p className="text-4xl font-black text-slate-900">{(report.preemptive_actions ?? 0).toLocaleString()}<span className="text-base font-bold text-slate-400 ml-1">건</span></p>
              <p className="text-[11px] text-slate-500 mt-1">외부발 {(report.preemptive_actions ?? 0).toLocaleString()} + 센서발 {(report.sensor_actions ?? 0).toLocaleString()} = 총 {report.auto_actions.toLocaleString()}건</p>
            </div>
            {/* ③ 결과 — 외부 유행기에도 병동 위험 억제 유지 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 mb-1">병동 감염위험 (결과)</p>
              <p className="text-4xl font-black text-emerald-600">{(report.peak_poi * 100).toFixed(1)}<span className="text-base font-bold text-slate-400 ml-1">% 이하</span></p>
              <p className="text-[11px] text-slate-500 mt-1">외부 유행기에도 CRITICAL {report.alert_events}건 — 선제 차단으로 확산 억제</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">↳ 외부 지역 유행을 <b className="text-slate-600">{report.max_lead_days ?? "N"}일 앞서</b> 감지해 ThinQ가 환기·정화를 미리 가동 → 병동 내 전파를 사전 차단. 가전 제어는 <i>수단</i>, 차별점은 <b className="text-[#7a0024]">선행 예방</b>.</p>
        </div>
      ) : null}

      {/* 핵심 KPI 4 (실측 연동) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIS.map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold"><k.Icon size={16} className={k.iconCls} /> {k.label}</div>
            <div className="text-4xl font-black text-slate-900">{k.num == null ? "—" : <CountUp end={k.num} fmt={k.fmt} />}<span className="text-lg font-medium text-slate-400 ml-1">{k.unit}</span></div>
            <p className={`text-[11px] font-bold px-2.5 py-1 rounded inline-block w-fit ${k.noteCls}`}>{k.note}</p>
          </div>
        ))}
      </div>

      {/* 비용 비교 차트 — 주차별 실측 자동대응 기반(ThinQ 절감 추정) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col h-[420px]">
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><TrendingDown size={20} className="text-emerald-600" /> 수동 방역 vs ThinQ 자동제어 유지비용</h3>
        <p className="text-sm text-slate-500 mb-6">주차별 자동대응 실측 기반 절감 추정 (단위: 만원/주)</p>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="수동방역비용" name="기존 수동 방역·인력(추정)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="ThinQ자동제어" name="ThinQ 자동제어 도입" stroke="#7a0024" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 공간별 감염위험 현황 (라이브) + 법규 준수 자동 증빙 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 공간별 현황 */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-7 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><ActivitySquare size={20} className="text-blue-600" /> 공간별 감염위험 현황</h3>
          <p className="text-sm text-slate-500 mb-5">전 병동 실시간 위험 등급 · Wells-Riley PoI</p>
          <div className="grid grid-cols-2 gap-2.5">
            {(spaces.length ? spaces : []).slice(0, 8).map((s) => {
              const t = DIR_TIER[s.tier] ?? DIR_TIER.MONITOR;
              return (
                <div key={s.space_id} className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-3 bg-slate-50/60">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{s.space_name}</p>
                    <p className="text-[11px] text-slate-400">PoI {s.poi != null ? (s.poi * 100).toFixed(1) + "%" : "—"} · CO₂ {s.co2_ppm ?? "—"}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${t.cls}`}>{t.ko}</span>
                </div>
              );
            })}
            {!spaces.length && <p className="col-span-2 text-sm text-slate-400 py-8 text-center">현황 불러오는 중…</p>}
          </div>
        </div>

        {/* 법규 준수 자동 증빙 */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-7 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-600" /> 법규 준수 자동 증빙</h3>
          <p className="text-sm text-slate-500 mb-5">
            감염관리 의무 → Sentinel 자동 증빙 · 누적 {report ? report.readings.toLocaleString() : "—"}건 기록
          </p>
          <div className="space-y-2.5">
            {COMPLIANCE.map((c) => (
              <div key={c.law} className="flex items-start gap-3 border border-slate-100 rounded-xl px-4 py-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[13px]">{c.law} <span className="font-normal text-slate-400">· {c.org}</span></p>
                  <p className="text-[11px] text-slate-500">{c.duty}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">→ {c.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}