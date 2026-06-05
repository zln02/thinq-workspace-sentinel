// frontend/app/demo/page.tsx
// 통합 라이브 시연 — 시연 시작 버튼 1회 → 백엔드 SSE 실시간 스트림 구독.
// 좌: 병동 관제 미니맵(실시간 tier). 우: 3역할 탭(관리자/간호사/보호자)이 같은 스트림을 다른 뷰로.
//  - 관리자: 외부 감염 선행신호 + 전 병동 위험도 + CO₂·PoI 실시간 추이
//  - 간호사: 담당 병동 경보 + 가동 중인 ThinQ 가전 + 수동 조치 필요 항목
//  - 보호자: 환자 안심 메시지 + 처리중→완료 실시간 타임라인
// 발표장 장애 대비: useDemoStream 이 재연결 3회 실패 시 오프라인 폴백으로 자동 전환.
"use client";

import { useMemo, useState } from "react";
import {
  Activity, Wind, Radio, ShieldCheck, Zap, Bell, Thermometer, Droplets,
  Users, Monitor, Smartphone, ArrowRight, CheckCircle2, Building2, PlayCircle,
  Loader2, WifiOff, Hand, Gauge,
} from "lucide-react";
import Link from "next/link";
import {
  useDemoStream, type Tier, type DemoSnapshot,
} from "../../lib/useDemoStream";

const TIER_CLS: Record<Tier, string> = {
  MONITOR:   "text-green-400 border-green-500/40 bg-green-500/10",
  CAUTION:   "text-amber-400 border-amber-500/50 bg-amber-500/10",
  ALERT:     "text-orange-400 border-orange-500/50 bg-orange-500/10",
  HIGH_RISK: "text-red-400 border-red-500/50 bg-red-500/10",
  CRITICAL:  "text-red-500 border-red-600/60 bg-red-600/15",
};
const TIER_KO: Record<Tier, string> = {
  MONITOR: "관찰", CAUTION: "주의", ALERT: "경계", HIGH_RISK: "위험", CRITICAL: "심각",
};

const SCENARIOS: { id: string; label: string }[] = [
  { id: "winter_influenza", label: "겨울 · 인플루엔자" },
  { id: "autumn_covid", label: "환절기 · COVID-19" },
  { id: "spring_tb", label: "봄 · 결핵" },
  { id: "summer_norovirus", label: "여름 · 노로바이러스" },
  { id: "heatwave_norovirus_double", label: "폭염 · 노로 2인 집단" },
];

type Role = "admin" | "nurse" | "family";

export default function DemoPage() {
  const s = useDemoStream();
  const [scenario, setScenario] = useState("winter_influenza");
  const [role, setRole] = useState<Role>("admin");

  const live = s.status === "streaming";
  const tier: Tier = s.latest?.tier ?? "MONITOR";

  // 좌측 미니맵 — A병동(시뮬 대상)만 실시간, 나머지는 안정적 배경값
  const wards = useMemo(() => ([
    { name: "A병동", loc: "동관 2층", tier, co2: s.latest?.co2 ?? 600, live: true },
    { name: "B병동", loc: "동관 3층", tier: "MONITOR" as Tier, co2: 610, live: false },
    { name: "C병동", loc: "서관 2층", tier: (tier === "HIGH_RISK" || tier === "CRITICAL" ? "CAUTION" : "MONITOR") as Tier, co2: 660, live: false },
    { name: "격리병동", loc: "서관 1층", tier: "MONITOR" as Tier, co2: 590, live: false },
  ]), [tier, s.latest?.co2]);

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-5 lg:p-7 flex flex-col">
      {/* 헤더 + 시연 컨트롤 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#A50034]/20 border border-[#A50034]/50 flex items-center justify-center text-[#A50034]"><PlayCircle size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-white">ThinQ Workspace Sentinel <span className="text-[#A50034]">라이브 시연</span></h1>
            <p className="text-xs text-slate-400 mt-0.5">외부 선행신호 → 내부 위험 격상 → ThinQ 가전 자동제어 — 실시간 스트림</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={s.status} />
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={live}
            className="bg-[#111827] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2 disabled:opacity-50"
          >
            {SCENARIOS.map((sc) => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
          </select>
          <button
            onClick={() => { s.start(scenario); }}
            disabled={live}
            className="px-4 py-2 bg-[#A50034] text-white rounded-lg text-sm font-bold hover:bg-[#8a002b] transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {live ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
            {live ? "시연 중…" : "시연 시작"}
          </button>
          <Link href="/" className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition">메인</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1">
        {/* 좌: 병동 관제 미니맵 */}
        <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-4 h-fit">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3"><Building2 size={16} className="text-[#A50034]" /> 병동 관제 · 아미나요양병원</div>
          <div className="space-y-2">
            {wards.map((w) => (
              <div key={w.name} className={`rounded-xl border p-3 transition-all duration-500 ${TIER_CLS[w.tier]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    {w.name}
                    {w.live && live && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#0B1120]/60">{TIER_KO[w.tier]}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>{w.loc}</span><span>CO₂ {Math.round(w.co2)}</span>
                </div>
              </div>
            ))}
          </div>
          {s.latest && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between"><span>경과(시뮬)</span><span className="text-slate-200">{Math.round(s.latest.t_min)}분</span></div>
              <div className="flex justify-between"><span>병동 체적</span><span className="text-slate-200">{s.latest.volume_m3 ?? "—"} ㎥</span></div>
              <div className="flex justify-between"><span>병원체</span><span className="text-slate-200">{s.latest.pathogen}</span></div>
            </div>
          )}
        </div>

        {/* 우: 역할 탭 */}
        <div className="rounded-2xl border border-slate-700/50 bg-[#0B1120]/40 p-5">
          <div className="flex gap-1.5 mb-4">
            {([
              { id: "admin" as Role, label: "관리자", icon: <Monitor size={14} /> },
              { id: "nurse" as Role, label: "간호사", icon: <Activity size={14} /> },
              { id: "family" as Role, label: "보호자", icon: <Smartphone size={14} /> },
            ]).map((t) => (
              <button key={t.id} onClick={() => setRole(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border transition ${role === t.id ? "bg-[#A50034] text-white border-[#A50034]" : "bg-transparent text-slate-400 border-slate-700/50 hover:bg-slate-800"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {s.status === "idle"
            ? <EmptyState />
            : role === "admin" ? <AdminView s={s} />
            : role === "nurse" ? <NurseView s={s} />
            : <FamilyView s={s} />}
        </div>
      </div>
    </main>
  );
}

/* ───────── 상태 뱃지 ───────── */
function StatusBadge({ status }: { status: string }) {
  if (status === "idle") return null;
  if (status === "fallback") return <span className="text-[11px] px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center gap-1"><WifiOff size={12} /> 오프라인 데모</span>;
  if (status === "done") return <span className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-1"><CheckCircle2 size={12} /> 시연 완료</span>;
  return <span className="text-[11px] px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> LIVE 스트림</span>;
}

function EmptyState() {
  return (
    <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-slate-500">
      <PlayCircle size={40} className="mb-3 text-slate-600" />
      <p className="text-sm">시나리오를 고르고 <span className="text-[#A50034] font-bold">시연 시작</span>을 누르면<br />백엔드 실시간 스트림이 3역할 화면에 동시 반영됩니다.</p>
    </div>
  );
}

type S = ReturnType<typeof useDemoStream>;

/* ───────── 관리자 뷰 ───────── */
function AdminView({ s }: { s: S }) {
  const ext = s.external;
  return (
    <div className="space-y-4">
      <SectTitle icon={<Radio size={16} />} text="외부 감염 선행신호 (모회 시스템 UIS 수신 · 3주 선행)" />
      {ext ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <ExtBox label="출처" value={ext.source} />
            <ExtBox label="지역" value={ext.region} />
            <ExtBox label="병원체" value={ext.pathogen} />
            <ExtBox label="신호 강도" value={ext.signal_level} cls="text-red-400" />
          </div>
          <div className="flex items-center justify-center gap-3 py-1">
            <span className="text-xs text-slate-400">선제 보정</span>
            <span className={`px-2.5 py-1 rounded-lg font-black border text-sm ${TIER_CLS[ext.pre_boost_tier]}`}>{TIER_KO[ext.pre_boost_tier]}</span>
            <ArrowRight size={15} className="text-slate-500" />
            <span className={`px-2.5 py-1 rounded-lg font-black border text-sm ${TIER_CLS[ext.post_boost_tier]}`}>{TIER_KO[ext.post_boost_tier]}</span>
            <span className="text-[11px] text-indigo-300">유입 전 격상</span>
          </div>
        </div>
      ) : <Skeleton text="외부 신호 수신 대기…" />}

      <SectTitle icon={<Gauge size={16} />} text="A병동 실시간 위험 지표" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Wind size={15} />} label="CO₂" value={s.latest ? Math.round(s.latest.co2).toString() : "—"} unit="ppm" warn={(s.latest?.co2 ?? 0) >= 1000} />
        <Metric icon={<Droplets size={15} />} label="습도" value={s.latest ? s.latest.rh.toFixed(0) : "—"} unit="%" />
        <Metric icon={<Activity size={15} />} label="6h PoI" value={s.latest ? (s.latest.poi * 100).toFixed(1) : "—"} unit="%" warn={(s.latest?.poi ?? 0) >= 0.15} />
        <Metric icon={<ShieldCheck size={15} />} label="위험도" value={s.latest ? TIER_KO[s.latest.tier] : "—"} unit="" warn={s.latest?.tier === "HIGH_RISK" || s.latest?.tier === "CRITICAL"} />
      </div>

      <SectTitle icon={<Activity size={16} />} text="CO₂ 추이 (실내공기질기준 1000ppm)" />
      <Sparkline snapshots={s.snapshots} />
    </div>
  );
}

/* ───────── 간호사 뷰 ───────── */
function NurseView({ s }: { s: S }) {
  const proto = s.protocol;
  const tier = s.latest?.tier ?? "MONITOR";
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${TIER_CLS[tier]}`}>
        <Bell size={20} />
        <div>
          <div className="font-bold text-white">A병동 · {TIER_KO[tier]} 등급</div>
          <div className="text-xs opacity-80 mt-0.5">{proto?.rationale ?? "위험도 평가 중…"}</div>
        </div>
      </div>

      <SectTitle icon={<Zap size={16} />} text="가동 중인 ThinQ 가전 (자동 제어)" />
      {proto?.device_summary?.length ? (
        <div className="space-y-2">
          {proto.device_summary.map((d, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#111827] px-3 py-2.5">
              <Wind size={15} className="text-[#A50034] shrink-0" />
              <span className="font-bold text-white text-sm w-28 shrink-0">{d.alias}</span>
              <span className="text-xs text-slate-300 flex-1">{d.mode}</span>
              <span className="text-[10px] text-emerald-300 border border-emerald-500/40 rounded px-1.5 py-0.5 shrink-0">자동</span>
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            </div>
          ))}
        </div>
      ) : <Skeleton text="가전 제어 명령 대기…" />}

      <SectTitle icon={<Hand size={16} />} text="수동 조치 필요 (간호 인력)" />
      {proto?.manual_required?.length ? (
        <div className="space-y-2">
          {proto.manual_required.map((m, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200">
              <Hand size={15} className="shrink-0" /> {m}
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-slate-500 px-1">현재 자동 제어로 충분 — 수동 조치 없음.</p>}
    </div>
  );
}

/* ───────── 보호자 뷰 ───────── */
function FamilyView({ s }: { s: S }) {
  const tier = s.latest?.tier ?? "MONITOR";
  const acting = s.status === "streaming" && (tier === "HIGH_RISK" || tier === "CRITICAL" || tier === "ALERT");
  const settled = s.status === "done" || tier === "MONITOR" || tier === "CAUTION";

  const steps = [
    { label: "지역 감염 신호 감지", done: !!s.external },
    { label: "병동 위험도 선제 격상", done: !!s.protocol },
    { label: "ThinQ 환경 자동 제어", done: !!s.protocol, active: acting },
    { label: "병동 환경 안정화", done: settled && s.status !== "idle" && !!s.protocol },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <Users size={28} className="mx-auto text-emerald-400 mb-2" />
        <div className="text-white font-bold">김OO 어르신 · A병동</div>
        <p className="text-sm text-emerald-200/90 mt-1">
          {acting ? "병동 환경 관리가 강화되고 있습니다. 안심하셔도 됩니다."
            : "현재 병동 환경은 안정적으로 관리되고 있습니다."}
        </p>
      </div>

      <SectTitle icon={<CheckCircle2 size={16} />} text="실시간 처리 현황" />
      <div className="space-y-2">
        {steps.map((st, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${st.done ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-700/50 bg-[#111827]"}`}>
            {st.done
              ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              : st.active
                ? <Loader2 size={18} className="text-amber-400 shrink-0 animate-spin" />
                : <span className="w-[18px] h-[18px] rounded-full border-2 border-slate-600 shrink-0" />}
            <span className={`text-sm ${st.done ? "text-white" : "text-slate-400"}`}>{st.label}</span>
            <span className="ml-auto text-[11px] text-slate-500">
              {st.done ? "완료" : st.active ? "처리중" : "대기"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
        <Thermometer size={12} /> 환경 관리 강화 시 보호자 앱에 자동 안심 알림이 발송됩니다.
      </p>
    </div>
  );
}

/* ───────── 공통 UI ───────── */
function Sparkline({ snapshots }: { snapshots: DemoSnapshot[] }) {
  if (snapshots.length < 2) return <Skeleton text="데이터 수집 중…" />;
  const co2s = snapshots.map((p) => p.co2);
  const min = Math.min(...co2s, 600), max = Math.max(...co2s, 1100);
  const W = 600, H = 90, pad = 4;
  const pts = co2s.map((v, i) => {
    const x = pad + (i / (co2s.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const yLimit = H - pad - ((1000 - min) / (max - min || 1)) * (H - pad * 2);
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[90px]" preserveAspectRatio="none">
        {yLimit > 0 && yLimit < H && (
          <line x1={pad} y1={yLimit} x2={W - pad} y2={yLimit} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        )}
        <polyline points={pts} fill="none" stroke="#A50034" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>0분</span><span className="text-amber-400">— 1000ppm 기준</span><span>{Math.round(snapshots[snapshots.length - 1].t_min)}분</span>
      </div>
    </div>
  );
}

function Skeleton({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-700/40 bg-[#111827] px-4 py-6 text-center text-xs text-slate-500">{text}</div>;
}
function SectTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><span className="text-[#A50034]">{icon}</span>{text}</div>;
}
function ExtBox({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-lg bg-[#0B1120]/60 border border-slate-700/50 p-2.5">
      <div className="text-[11px] text-slate-400 mb-0.5">{label}</div>
      <div className={`text-sm font-black ${cls ?? "text-slate-100"}`}>{value}</div>
    </div>
  );
}
function Metric({ icon, label, value, unit, warn }: { icon: React.ReactNode; label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">{icon}{label}</div>
      <div className={`text-2xl font-black ${warn ? "text-red-400" : "text-slate-100"}`}>{value}<span className="text-xs font-normal ml-0.5 text-slate-500">{unit}</span></div>
    </div>
  );
}
