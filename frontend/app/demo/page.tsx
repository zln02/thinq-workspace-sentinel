// frontend/app/demo/page.tsx
// 통합 시연 시나리오 8단계 (백엔드 없이 mock으로 발표 완주)
// 평상시 관제 → 시군구 외부신호 → 내부 위험도 사전보정 → 다중 페르소나 알림
// → ThinQ 가전 자동제어 → 웹/앱 화면전환 → 전후 개선결과 → ESG 보고서 자동생성
// 좌: 병동 관제 미니맵(항상) / 우: 단계별 메인 패널. 발표자는 하단 컨트롤러로 큐 진행.
"use client";

import { useState } from "react";
import {
  Activity, Wind, Radio, Search, Pill, ShieldCheck, Zap, FileCheck2, Calculator,
  PlayCircle, TrendingUp, Route, DoorClosed, SprayCan, Bell, Thermometer, Droplets,
  Users, Monitor, Smartphone, Leaf, ArrowRight, CheckCircle2, Building2, Banknote, Clock, ShieldAlert,
} from "lucide-react";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const SLOT = "▱▱▱"; // PoC 30일 실측 전 placeholder

// 5-Tier 색상
const TIER: Record<string, string> = {
  MONITOR:   "text-green-400 border-green-500/40 bg-green-500/10",
  CAUTION:   "text-amber-400 border-amber-500/50 bg-amber-500/10",
  ALERT:     "text-orange-400 border-orange-500/50 bg-orange-500/10",
  HIGH_RISK: "text-red-400 border-red-500/50 bg-red-500/10",
  CRITICAL:  "text-red-500 border-red-600/60 bg-red-600/15",
};

// 병동 관제 상태 (단계별 주인공 = A병동)
type Ward = { name: string; loc: string; tier: keyof typeof TIER; co2: number };
const WARDS = (step: Step): Ward[] => {
  const a: keyof typeof TIER =
    step <= 2 ? "CAUTION" : step <= 6 ? "HIGH_RISK" : "CAUTION";
  const aco2 = step <= 2 ? 690 : step === 3 ? 720 : step <= 6 ? 730 : 620;
  return [
    { name: "A병동", loc: "동관 2층", tier: a, co2: aco2 },
    { name: "B병동", loc: "동관 3층", tier: "MONITOR", co2: 610 },
    { name: "C병동", loc: "서관 2층", tier: step >= 3 ? "CAUTION" : "MONITOR", co2: 660 },
    { name: "격리병동", loc: "서관 1층", tier: "MONITOR", co2: 590 },
  ];
};

const STEP_META: Record<Step, { title: string; cue: string }> = {
  1: { title: "평상시 병동 관제", cue: "지금은 요양병원 내부가 평상시 상태입니다. 각 병동의 CO₂·습도·재실·공기질·감염 위험도를 중앙 관제에서 보고 있습니다." },
  2: { title: "시군구 외부 오염·감염 신호 상승", cue: "특정 시군구에서 외부 오염 농도와 감염 신호가 상승했습니다. 병원 내부 문제는 아니지만, 이 지역의 유입 위험이 높아졌다고 판단합니다." },
  3: { title: "병원 내부 위험도 사전 보정", cue: "내부 센서만 보는 게 아니라 시군구 외부 신호를 함께 반영합니다. 내부 문제가 커진 뒤가 아니라, 유입 전에 공간 위험도를 미리 보정합니다." },
  4: { title: "위험 경보 발송 (병원장·운영자·보호자)", cue: "위험도가 높아지면 병원장·운영자·보호자에게 각각 다른 메시지로 알림이 전달됩니다." },
  5: { title: "ThinQ 가전 자동제어 실행", cue: "경보는 알림에서 끝나지 않습니다. 위험을 낮추기 위해 ThinQ 가전 운전 상태를 자동으로 바꿉니다." },
  6: { title: "웹/앱 화면 전환", cue: "관리자는 병동 위험도와 조치 이력을, 현장 직원은 실행된 조치를, 보호자는 환경 관리 강화 정보를 받습니다." },
  7: { title: "대응 전후 결과 확인", cue: "자동제어 이후 공기질과 위험 지표가 개선됩니다. 시스템은 대응 전후를 비교해 실제로 위험이 낮아졌는지 확인합니다." },
  8: { title: "ESG 보고서 자동 생성", cue: "모든 대응 이력이 ESG 보고서로 연결됩니다. 취약계층 보호·감염 예방·에너지 효율·보호자 커뮤니케이션이 자동 기록됩니다." },
};

export default function DemoPage() {
  const [step, setStep] = useState<Step>(1);
  const wards = WARDS(step);
  const meta = STEP_META[step];

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-5 lg:p-7 pb-24 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#A50034]/20 border border-[#A50034]/50 flex items-center justify-center text-[#A50034]"><PlayCircle size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-white">ThinQ Workspace Sentinel <span className="text-[#A50034]">통합 시연</span></h1>
            <p className="text-xs text-slate-400 mt-0.5">지역 외부 위험을 먼저 감지하고 병원 내부를 선제 제어한다 — 8단계 시나리오</p>
          </div>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition">메인으로</Link>
      </div>

      {/* 단계 타이틀 + 발표 멘트 큐 */}
      <div className="mb-4 px-5 py-3 rounded-xl bg-[#111827] border border-slate-800">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="w-7 h-7 rounded-full bg-[#A50034] text-white text-sm font-bold flex items-center justify-center shrink-0">{step}</span>
          <span className="text-lg font-bold text-white">{meta.title}</span>
          <span className="text-[11px] text-slate-500 ml-auto">발표 멘트 ↓</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed pl-10">{meta.cue}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1">
        {/* 좌: 병동 관제 미니맵 (항상) */}
        <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-4 h-fit">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3"><Building2 size={16} className="text-[#A50034]" /> 병동 관제</div>
          <div className="space-y-2">
            {wards.map((w) => (
              <div key={w.name} className={`rounded-xl border p-3 transition-all duration-500 ${TIER[w.tier]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{w.name}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#0B1120]/60">{w.tier}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>{w.loc}</span><span>CO₂ {w.co2}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우: 단계별 메인 패널 */}
        <div className="rounded-2xl border border-slate-700/50 bg-[#0B1120]/40 p-5">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
          {step === 6 && <Step6 />}
          {step === 7 && <Step7 />}
          {step === 8 && <Step8 />}
        </div>
      </div>

      {/* 발표자 컨트롤러 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#111827] border border-slate-800 p-2 rounded-2xl shadow-2xl flex gap-1.5 z-50 flex-wrap justify-center max-w-[95vw]">
        {([1,2,3,4,5,6,7,8] as Step[]).map((n) => (
          <button key={n} onClick={() => setStep(n)} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all border ${step===n?"bg-[#A50034] text-white border-[#A50034] shadow-[0_0_12px_rgba(165,0,52,0.5)] scale-105":"bg-transparent text-slate-400 border-transparent hover:bg-slate-800"}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step===n?"bg-white text-[#A50034]":"bg-slate-800"}`}>{n}</span>
            {["평상시","외부신호","사전보정","경보","가전제어","화면전환","개선결과","ESG"][n-1]}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ───────── 단계별 패널 ───────── */

function Step1() {
  return (
    <div>
      <SectTitle icon={<Monitor size={16} />} text="평상시 — 전 병동 환경·감염 위험도 모니터링" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Metric icon={<Wind size={15} />} label="평균 CO₂" value="640" unit="ppm" ok />
        <Metric icon={<Droplets size={15} />} label="평균 습도" value="48" unit="%" ok />
        <Metric icon={<Users size={15} />} label="총 재실" value="62" unit="명" ok />
        <Metric icon={<Activity size={15} />} label="공기질(PM2.5)" value="12" unit="㎍" ok />
      </div>
      <SectTitle icon={<Zap size={16} />} text="현재 가전 운전 상태" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {["공기청정기 · 자동(약)","환기장치 · 정상","가습기 · 48% 유지","냉난방기 · 23.5℃","UV살균기 · 대기","표면관리 · 대기"].map((d,i)=>(
          <div key={i} className="text-xs text-slate-300 bg-[#111827] rounded-lg px-3 py-2 border border-slate-700/40">{d}</div>
        ))}
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div>
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-indigo-300 text-sm font-bold"><Radio size={16} /> 시군구 단위 외부 데이터 — 병원 내부 문제 아님, 유입 위험 상승</div>
        <div className="grid grid-cols-3 gap-3">
          <ExtBox icon={<TrendingUp size={16} />} label="외부 오염 농도" value="높음" cls="text-red-400" />
          <ExtBox icon={<Search size={16} />} label="DataLab 감염 검색" value="+180%" cls="text-red-400" />
          <ExtBox icon={<Pill size={16} />} label="약국 OTC 판매" value="+75%" cls="text-red-400" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 py-3">
        <div className="text-center"><div className="text-xs text-slate-400 mb-1">지역 위험도</div><span className="px-3 py-1.5 rounded-lg font-black border text-green-400 border-green-500/40 bg-green-500/10">MONITOR</span></div>
        <ArrowRight className="text-slate-500" />
        <div className="text-center"><div className="text-xs text-slate-400 mb-1">상승</div><span className="px-3 py-1.5 rounded-lg font-black border text-amber-400 border-amber-500/50 bg-amber-500/10">CAUTION</span></div>
      </div>
      <p className="text-xs text-slate-500 text-center">※ 이 시점 병원 내부 센서는 아직 정상입니다. 외부 신호가 먼저 움직였습니다.</p>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <SectTitle icon={<ShieldCheck size={16} />} text="내부 환경 + 외부 오염·감염 신호 결합 → 5-Tier 재계산" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-3">
          <div className="text-xs text-slate-400 mb-2 font-bold">내부 환경 (A병동)</div>
          {[["CO₂ 증가","720ppm"],["습도 불균형","58%"],["재실 인원 증가","18명"],["환기 부족","ACH 3.2"]].map(([k,v],i)=>(
            <div key={i} className="flex justify-between text-xs text-slate-300 py-0.5"><span>{k}</span><span className="text-slate-100 font-bold">{v}</span></div>
          ))}
        </div>
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
          <div className="text-xs text-indigo-300 mb-2 font-bold">외부 신호</div>
          {[["외부 오염 농도","↑ 높음"],["외부 감염 신호","↑ 상승"],["재호흡률 f","0.018"],["6h 후 PoI","18%"]].map(([k,v],i)=>(
            <div key={i} className="flex justify-between text-xs text-slate-300 py-0.5"><span>{k}</span><span className="text-indigo-200 font-bold">{v}</span></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-slate-700/50 bg-slate-800/20 p-3">
          <div className="text-xs text-slate-500 mb-1">일반 IoT (반응형)</div>
          <div className="text-lg font-black text-slate-500">무반응</div>
          <div className="text-[11px] text-slate-500 mt-1">CO₂ 720 {"<"} 임계 1000 → 판단 안 함</div>
        </div>
        <div className="rounded-xl border-2 border-red-500/50 bg-red-500/5 p-3">
          <div className="text-xs text-slate-400 mb-1">A병동 위험도 사전 보정</div>
          <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded font-black text-amber-400 border border-amber-500/50 bg-amber-500/10 text-sm">CAUTION</span><ArrowRight size={14} className="text-slate-500" /><span className="px-2 py-0.5 rounded font-black text-red-400 border border-red-500/50 bg-red-500/10 text-sm">HIGH_RISK</span></div>
          <div className="text-[11px] text-red-300/70 mt-1">외부 유입 위험 반영 — 터지기 전 선제 격상</div>
        </div>
      </div>
    </div>
  );
}

function Step4() {
  const alerts = [
    { who:"병원장", icon:<Building2 size={16}/>, color:"bg-[#A50034]", msg:"지역 오염·감염 신호 상승. 병동 선제 대응 필요", tone:"조치 중심" },
    { who:"운영자", icon:<Monitor size={16}/>, color:"bg-blue-600", msg:"A병동 위험도 상승. 자동 환기·공기청정 프로토콜 실행", tone:"실행 중심" },
    { who:"보호자", icon:<Users size={16}/>, color:"bg-emerald-600", msg:"현재 병동 환경 관리가 강화되었습니다", tone:"안심 메시지" },
  ];
  return (
    <div>
      <SectTitle icon={<Bell size={16} />} text="대상별 맞춤 경보 발송 — 같은 상황, 다른 메시지" />
      <div className="space-y-3">
        {alerts.map((a,i)=>(
          <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-[#111827] p-4">
            <div className={`p-2 rounded-lg text-white shrink-0 ${a.color}`}>{a.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="font-bold text-white">{a.who}</span><span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">{a.tone}</span></div>
              <p className="text-sm text-slate-300 mt-1">{a.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step5() {
  const acts = [
    { icon:<Wind size={15}/>, name:"공기청정기", cmd:"운전 강도 약 → 강(터보)", cover:"인플루엔자·COVID" },
    { icon:<Route size={15}/>, name:"환기장치", cmd:"환기량 증가 (ACH 3.2 → 6.0)", cover:"공기전파 저감" },
    { icon:<Droplets size={15}/>, name:"가습/제습기", cmd:"습도 58% → 50% 조정", cover:"바이러스 생존율↓" },
    { icon:<Thermometer size={15}/>, name:"냉난방기", cmd:"실내 23.5℃ 최적 유지", cover:"환경 안정화" },
    { icon:<SprayCan size={15}/>, name:"UV살균·표면관리", cmd:"우선순위 살균 제안", cover:"결핵·노로·CDI·옴" },
  ];
  return (
    <div>
      <SectTitle icon={<Zap size={16} />} text="Smart Protocol 자동 실행 — 가상 기기 제어 로그" />
      <div className="space-y-2 mb-3">
        {acts.map((a,i)=>(
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#111827] px-3 py-2.5">
            <div className="text-[#A50034] shrink-0">{a.icon}</div>
            <span className="font-bold text-white text-sm w-32 shrink-0">{a.name}</span>
            <span className="text-xs text-slate-300 flex-1">{a.cmd}</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5 shrink-0">{a.cover}</span>
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          </div>
        ))}
      </div>
      <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
        <Zap size={14} /> 전력 승인 게이트: 동시가동 전력한도 검증 후 승인 (무분별 자동제어 아님)
      </div>
    </div>
  );
}

function Step6() {
  const views = [
    { icon:<Monitor size={18}/>, who:"관리자 (웹)", items:["병동별 위험도","조치 이력","수치 변화 추이"] },
    { icon:<Monitor size={18}/>, who:"운영자 (웹)", items:["자동 대응 실행 로그","기기 제어 상태","프로토콜 결과"] },
    { icon:<Smartphone size={18}/>, who:"보호자 (앱)", items:["현재 병동은 관리 중","환경 관리 강화 완료","안심 알림"] },
  ];
  return (
    <div>
      <SectTitle icon={<Smartphone size={16} />} text="역할별 화면 — 웹은 관리/운영, 앱은 보호자·현장" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {views.map((v,i)=>(
          <div key={i} className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
            <div className="flex items-center gap-2 mb-3 text-white font-bold"><span className="text-[#A50034]">{v.icon}</span>{v.who}</div>
            <ul className="space-y-1.5">{v.items.map((it,j)=>(<li key={j} className="text-xs text-slate-300 flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0" />{it}</li>))}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step7() {
  const rows = [
    { k:"CO₂", before:"720 ppm", after:"620 ppm", good:true },
    { k:"습도", before:"58% (불균형)", after:"50% (정상)", good:true },
    { k:"6h 후 감염확률(PoI)", before:"18%", after:"6%", good:true },
    { k:"A병동 위험도", before:"HIGH_RISK", after:"CAUTION", good:true },
  ];
  return (
    <div>
      <SectTitle icon={<TrendingUp size={16} />} text="자동제어 전후 비교 — 실제로 위험이 낮아졌는가" />
      <div className="rounded-xl border border-slate-700/50 bg-[#111827] overflow-hidden">
        <div className="grid grid-cols-[1.3fr_1fr_auto_1fr] gap-2 px-4 py-2 text-[11px] text-slate-500 border-b border-slate-700/50">
          <span>지표</span><span className="text-right">대응 전</span><span></span><span className="text-right">대응 후</span>
        </div>
        {rows.map((r,i)=>(
          <div key={i} className="grid grid-cols-[1.3fr_1fr_auto_1fr] gap-2 px-4 py-2.5 items-center border-b border-slate-800 last:border-0">
            <span className="text-sm text-slate-300">{r.k}</span>
            <span className="text-sm text-red-400 text-right font-bold">{r.before}</span>
            <ArrowRight size={14} className="text-slate-600" />
            <span className="text-sm text-green-400 text-right font-bold">{r.after}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step8() {
  const report = [
    "지역 외부 위험 신호 발생 시각","병동 위험도 변화 (CAUTION→HIGH_RISK→CAUTION)",
    "자동제어 실행 내역 (5개 기기)","위험도 개선 결과 (PoI 18%→6%)",
    "보호자 알림 이력","에너지·환경 관리 이력","취약계층 보호 조치",
  ];
  const roi = [
    { icon:<Leaf size={15}/>, label:"에너지 절감", val:`${SLOT} kWh/월` },
    { icon:<Leaf size={15}/>, label:"탄소 저감", val:`${SLOT} kg/월` },
    { icon:<Clock size={15}/>, label:"감염관리 수기업무 절감", val:`${SLOT} h/주` },
    { icon:<ShieldAlert size={15}/>, label:"집단감염 리스크 회피", val:`₩${SLOT}` },
  ];
  return (
    <div>
      <SectTitle icon={<FileCheck2 size={16} />} text="ESG 보고서 자동 생성 — 조치 이력이 증빙으로" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="text-xs text-emerald-300 font-bold mb-2">보고서 자동 수록 항목</div>
          <ul className="space-y-1.5">{report.map((r,i)=>(<li key={i} className="text-xs text-slate-300 flex items-start gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />{r}</li>))}</ul>
          <div className="mt-3 px-3 py-2 rounded-lg bg-[#0B1120]/60 text-[11px] text-slate-400 flex items-center gap-2"><FileCheck2 size={13} className="text-emerald-400" /> 감염병예방법·실내공기질관리법 증빙 PDF 자동 생성</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5"><Calculator size={14}/> 측정가능 ROI</span><span className="text-[10px] text-slate-500">PoC 30일 실측 후 확정</span></div>
          <div className="grid grid-cols-2 gap-2">
            {roi.map((r,i)=>(
              <div key={i} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-emerald-300 mb-1">{r.icon}{r.label}</div>
                <div className="text-base font-black text-white">{r.val}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 px-3 py-2 rounded-lg bg-[#A50034]/10 border border-[#A50034]/40 text-[11px] text-slate-300 flex items-center gap-2">
            <Banknote size={13} className="text-[#A50034]" /> LG ThinQ 렌탈 구독 — 페이백 <span className="font-black text-[#A50034]">{SLOT}개월</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4 leading-relaxed border-l-2 border-[#A50034] pl-3">
        단순 대시보드가 아니라, 지역 외부 위험을 먼저 감지하고 병원 내부 환경을 선제 제어하며, 보호자 안심과 ESG 증빙까지 연결하는 플랫폼입니다.
      </p>
    </div>
  );
}

/* ───────── 공통 헬퍼 ───────── */

function SectTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3"><span className="text-[#A50034]">{icon}</span>{text}</div>;
}
function ExtBox({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl bg-[#0B1120]/60 border border-slate-700/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">{icon}{label}</div>
      <div className={`text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
function Metric({ icon, label, value, unit, ok }: { icon: React.ReactNode; label: string; value: string; unit: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">{icon}{label}</div>
      <div className={`text-2xl font-black ${ok ? "text-slate-100" : "text-red-400"}`}>{value}<span className="text-xs font-normal ml-0.5 text-slate-500">{unit}</span></div>
    </div>
  );
}
