"use client";
// 관리자 흐름 패널 — 외부신호 → 센서 실측 → 계산(PoI) → 결정 → 가전 세팅 전 과정을
// 실데이터로 한 줄에 보여준다. 각 단계가 "왜 이 제어인지"를 투명하게 설명(B2G 인증 증빙).
import { ChevronRight, Globe, Activity, Calculator, ShieldCheck, Wind } from "lucide-react";
import { useExternalBoost, useControlPlan, useLiveWard } from "@/lib/useSentinel";
import { TIER_META, type Tier } from "@/lib/tier";

const TIER_KO: Record<string, string> = {
  MONITOR: "정상", CAUTION: "주의", ALERT: "경계", HIGH_RISK: "고위험", CRITICAL: "위급",
};
const GOV_KO: Record<string, string> = {
  none: "대기", auto: "AI 자동제어", approval_required: "관리자 승인 대기",
  approved: "승인 실행", auto_restore: "정상 복귀",
};

function num(x: number | null | undefined, dp = 0) {
  return x == null ? "—" : (dp ? x.toFixed(dp) : Math.round(x).toString());
}
function pct(x: unknown, dp = 1) {
  return typeof x === "number" ? (x * 100).toFixed(dp) + "%" : "—";
}
function tierBadge(t: string) {
  const m = TIER_META[t as Tier] ?? TIER_META.MONITOR;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.bg} ${m.text}`}>{TIER_KO[t] ?? t}</span>;
}

function Stage({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-3 uppercase tracking-wide">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Arrow() {
  return <ChevronRight className="text-slate-300 shrink-0 self-center hidden xl:block" size={22} />;
}

export default function FlowPanel({ spaceId = "ward_a" }: { spaceId?: string }) {
  const { data: live, connected } = useLiveWard(spaceId);
  const boost = useExternalBoost();
  const plan = useControlPlan(spaceId, live?.tier);

  const f = (live?.formula ?? {}) as Record<string, unknown>;
  const co2 = live?.co2_ppm ?? (typeof f.co2 === "number" ? f.co2 : null);
  const reb = live?.rebreathed_fraction ?? f.f;
  const poi = live?.poi ?? (typeof f.poi === "number" ? f.poi : null);
  const tier = live?.tier ?? "MONITOR";
  const boostActive = boost !== "MONITOR";

  return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
          <Wind size={18} className="text-[#A50034]" /> 자동 방역 의사결정 흐름
          <span className="text-xs font-normal text-slate-400">외부신호 → 센서 → 계산 → 결정 → 가전</span>
        </h2>
        <span className={`text-xs font-semibold flex items-center gap-1 ${connected ? "text-emerald-600" : "text-slate-400"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          {connected ? "실시간" : "연결 대기"}
        </span>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 xl:items-stretch">
        {/* ① 외부 위험요소 */}
        <Stage icon={<Globe size={14} />} title="외부 감염 신호">
          <div className="flex items-center gap-2">{tierBadge(boost)}</div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {boostActive ? "지역 유행 감지 → 선제 boost (센서 정상이어도 사전 가동)" : "선택 지역 외부 신호 안정"}
          </p>
        </Stage>
        <Arrow />

        {/* ② 센서 실측 */}
        <Stage icon={<Activity size={14} />} title="센서 실측">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-500">CO₂</span><b className="text-right tabular-nums">{num(co2)} <span className="text-[10px] font-normal text-slate-400">ppm</span></b>
            <span className="text-slate-500">재실</span><b className="text-right tabular-nums">{live?.occupancy ?? "—"} <span className="text-[10px] font-normal text-slate-400">명</span></b>
            <span className="text-slate-500">PM2.5</span><b className="text-right tabular-nums">{num(live?.pm25)}</b>
            <span className="text-slate-500">온/습</span><b className="text-right tabular-nums">{num(live?.temp_c, 1)}° / {num(live?.humidity)}%</b>
          </div>
        </Stage>
        <Arrow />

        {/* ③ 계산 (Rudnick-Milton / Wells-Riley) */}
        <Stage icon={<Calculator size={14} />} title="감염위험 계산">
          <div className="text-xs text-slate-400 mb-1">Rudnick-Milton</div>
          <div className="flex items-center flex-wrap gap-1 text-xs text-slate-600">
            <span>재호흡률 <b>{pct(reb, 2)}</b></span>
            <ChevronRight size={12} className="text-slate-300" />
            <span>PoI <b className="text-[#A50034]">{pct(poi, 1)}</b></span>
          </div>
          <div className="mt-2">{tierBadge(tier)}</div>
        </Stage>
        <Arrow />

        {/* ④ 제어 결정 (거버넌스) */}
        <Stage icon={<ShieldCheck size={14} />} title="제어 결정">
          <p className="text-sm font-bold text-slate-700">{GOV_KO[live?.governance ?? "none"] ?? "대기"}</p>
          {live?.approval_required && (
            <p className="text-xs text-amber-600 mt-1 font-semibold">하이브리드 거버넌스 — 승인 필요</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {plan?.pathogen ? `위협: ${plan.pathogen} · ${plan.season}` : "정책 로딩…"}
          </p>
        </Stage>
        <Arrow />

        {/* ⑤ 가전 세팅 */}
        <Stage icon={<Wind size={14} />} title="가전 자동 세팅">
          {plan ? (
            <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {plan.applied.map((d) => (
                <li key={d.device} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <b className="text-slate-700">{d.name_kr}</b>
                    <span className="text-emerald-600 font-semibold text-right shrink-0">{d.setting}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{d.reason}</span>
                </li>
              ))}
              {plan.skipped.length > 0 && (
                <li className="text-[11px] text-slate-300 pt-1">대기: {plan.skipped.map((d) => d.name_kr).join(", ")}</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">제어계획 로딩…</p>
          )}
        </Stage>
      </div>

      {plan?.rationale && (
        <p className="text-xs text-slate-500 mt-3 pl-1 border-l-2 border-[#A50034]/40 ml-1">
          근거: {plan.rationale}
        </p>
      )}
    </section>
  );
}
