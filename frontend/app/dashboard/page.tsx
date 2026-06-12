// frontend/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, LogOut, Clock, Users, AlertTriangle, HeartPulse, FileText, 
  ActivitySquare, CheckCircle2, Zap, BatteryCharging, Wrench, TrendingDown, 
  X, Check, AlertCircle, Activity, TrendingUp, DownloadCloud, Leaf, Wind, Thermometer, Power, Radio
} from "lucide-react";
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, LineChart 
} from 'recharts';
import { FloorPlan, type SpaceCard } from "@/components/domain/FloorPlan";
import { useLiveWard, useSpacesOverview, useReport, useExternalSignal, useCowayStatus, useAcStatus, useControlPlan, sendControl, sendApprove, type SpaceOverview } from "@/lib/useSentinel";
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
// 🚀 메인 대시보드 컴포넌트 
// ============================================================================
export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");
  // 201호 실센서 SSE — 헤더 전역 LIVE 인디케이터용(영상에서 실데이터 가동 상시 노출)
  const { data: live, connected: liveConnected } = useLiveWard("ward_a");

  useEffect(() => {
    // 권한 가드 — 미로그인/타권한 접근 시 로그인으로. SUPER 는 전체 허용.
    const s = getSession();
    if (!canAccess(s, ["NURSE", "FM", "DIRECTOR"])) { router.replace("/"); return; }
    const viewRole = ["NURSE", "FM", "DIRECTOR"].includes(s!.role) ? s!.role : "NURSE";
    setRole(viewRole);
    setUserName(s!.name || "수간호사");

    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const handleLogout = () => { clearSession(); router.push("/"); };

  if (!role) return null;

  return (
    <div className="min-h-screen bg-[#F3F7FB] text-slate-700 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#7a0024] flex items-center justify-center text-white shadow-sm"><ShieldAlert size={22} /></div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">ThinQ Space <span className="text-[#7a0024]">Sentinel</span></h1>
        </div>
        
        <div className="flex items-center gap-8">
          {role === "DIRECTOR" && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full text-emerald-700 text-sm shadow-sm animate-in fade-in zoom-in duration-500">
              <CheckCircle2 size={16} /><span className="font-bold">법정 컴플라이언스 100% 준수</span>
            </div>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${liveConnected ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-100 border-slate-300 text-slate-500"}`}>
            <span className="relative flex h-2 w-2">
              {liveConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${liveConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
            </span>
            <Radio size={14} /> 201호 실센서 {liveConnected ? `LIVE · ${live?.tier ?? "···"}` : "연결중"}
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-medium"><Clock size={16} className="text-slate-400"/> {time}</div>

          <div className="flex items-center gap-4 border-l border-slate-200 pl-8">
            <span className="text-slate-900 font-bold text-lg">{userName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-[#7a0024] text-slate-600 rounded-lg text-sm transition-colors border border-slate-200 hover:border-red-200">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 💡 전체 화면 스크롤바 숨김 적용 */}
      <div className="flex-1 p-8 overflow-y-auto max-w-[1600px] mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {role === "NURSE" && <NurseView />}
        {role === "FM" && <FMView />}
        {role === "DIRECTOR" && <DirectorView />}
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
  const [myRegion, setMyRegion] = useState<string>("");
  useEffect(() => { setMyRegion(getSession()?.region ?? ""); }, []);
  if (!regions.length) return null;
  // 로그인 병원의 지역 신호만 표시(지역 고정). 못 찾으면 전국 최고위험으로 폴백.
  const top = regions.find((r) => r.region === myRegion)
    ?? [...regions].sort((a, b) => (b.live_score ?? 0) - (a.live_score ?? 0))[0];
  const st = LV_STYLE[top.live_level] ?? LV_STYLE.GREEN;
  const disease = DISEASE_KR[top.disease] ?? top.disease;
  const peak = top.conf_peak_date ? `${Number(top.conf_peak_date.slice(5, 7))}월 ${Number(top.conf_peak_date.slice(8, 10))}일` : "-";
  return (
    <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 ${st.bg}`}>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl">🦠</span>
        <div>
          <p className="text-[11px] font-bold text-slate-500">외부 감염병 조기경보 · 질병청 UIS 연동</p>
          <p className={`text-sm font-black ${st.text}`}>{top.region} {disease} <span>{st.label}({top.live_score ?? "—"})</span></p>
        </div>
      </div>
      <div className="hidden sm:block h-9 w-px bg-slate-200" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-bold">📈 유행 피크 예측 {peak}{top.lead_days != null && top.lead_days > 0 ? <span className="text-[#7a0024]"> · D-{top.lead_days} 선행 경보</span> : null}</p>
        <p className="text-xs text-slate-500 mt-0.5">예측 위험 도달 시 ThinQ가 전 병동 <b className="text-slate-700">선제 환기·정화 자동 강화</b> · 전국 {regions.length}개 지역 실시간 감시</p>
      </div>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${st.dot} opacity-60`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${st.dot}`} />
      </span>
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
        <div className="xl:col-span-3 space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Wind className="text-blue-600" size={20} /> 병동 환경 관제맵 <span className="text-xs font-normal text-slate-500">· 백엔드 라이브 · CO₂ → AI 5-Tier</span></h3>
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="text-blue-600" size={18} /> 수간호사 인수인계</h3>
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
  const govLabel: Record<string, string> = { none: "대기", auto: "AI 자동제어", approval_required: "관리자 승인 대기", approved: "승인 실행", auto_restore: "정상 복귀" };

  const act = async (action: string, label: string) => {
    setBusy(action);
    await sendControl(action, "ward_a");
    setBusy(null);
    setToast(`${label} 명령 전송됨`);
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Power size={20} className="text-[#7a0024]" /> 실 가전 제어 콘솔</h3>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${governance === "auto" ? "bg-emerald-50 text-emerald-700" : approvalNeeded ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>거버넌스: {govLabel[governance] ?? governance}</span>
        </div>
        <p className="text-xs text-slate-400 mb-5">201호 실센서 공간 · 실제 LG ThinQ/SmartThings 가전을 직접 제어합니다</p>

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
  const KPIS = [
    { Icon: Zap, iconCls: "text-amber-600", noteCls: "text-amber-700 bg-amber-50",
      label: "자동 선제대응", value: report ? report.auto_actions.toLocaleString() : "—", unit: "건",
      note: `최근 ${report?.period.days ?? 30}일 · tier ALERT↑ 무인 대응` },
    { Icon: ActivitySquare, iconCls: "text-blue-600", noteCls: "text-blue-700 bg-blue-50",
      label: "연속 모니터링 기록", value: report ? report.readings.toLocaleString() : "—", unit: "건",
      note: `감염관리 증빙 자동 로깅 · ${report?.spaces_monitored ?? 0}개 공간` },
    { Icon: TrendingDown, iconCls: "text-emerald-600", noteCls: "text-emerald-700 bg-emerald-50",
      label: "방역비용 절감(추정)", value: report ? fmtKRW(report.est_cost_saved_krw) : "—",
      unit: report && report.est_cost_saved_krw >= 10000 ? "만원" : "천원",
      note: "추정 — 자동대응 1건당 인건·에너지 절감" },
    { Icon: ShieldAlert, iconCls: "text-purple-600", noteCls: "text-purple-700 bg-purple-50",
      label: "기간 최고 감염위험", value: report ? (report.peak_poi * 100).toFixed(1) : "—", unit: "%",
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

      {/* 핵심 KPI 4 (실측 연동) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIS.map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold"><k.Icon size={16} className={k.iconCls} /> {k.label}</div>
            <div className="text-4xl font-black text-slate-900">{k.value}<span className="text-lg font-medium text-slate-400 ml-1">{k.unit}</span></div>
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