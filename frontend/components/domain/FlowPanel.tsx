"use client";
// 자동 방역 의사결정 흐름 패널 — 외부신호 → 센서 실측 → 계산(PoI) → 등급결정 → 가전 세팅
// 전 과정을 201호 실데이터로 보여주고, 핵심 계산식에 라이브 값을 대입해 "왜 이 제어인지"를
// 투명하게 증빙한다(B2G 인증·시연용).
import { ChevronRight, Globe, Activity, Sigma, ShieldCheck, Wind, Users } from "lucide-react";
import { useExternalBoost, useControlPlan, useLiveWard } from "@/lib/useSentinel";
import { TIER_META, tierRank, type Tier } from "@/lib/tier";

// Rudnick-Milton 상수 (backend rebreathed.py 와 일치)
const C_OUT = 420;     // 외기 CO₂(ppm)
const C_EXH = 38000;   // 날숨 CO₂(ppm)

const POI_TIERS: [number, Tier][] = [[0.30, "CRITICAL"], [0.15, "HIGH_RISK"], [0.05, "ALERT"], [0.01, "CAUTION"]];
function poiToTier(poi: number | null | undefined): Tier {
  if (poi == null) return "MONITOR";
  for (const [thr, name] of POI_TIERS) if (poi >= thr) return name;
  return "MONITOR";
}

// 거버넌스 단계 → 한글 + 색 (backend _gov_level / governance 문자열)
const GOV_META: Record<string, { ko: string; cls: string; desc: string }> = {
  none:              { ko: "대기",          cls: "bg-slate-100 text-slate-500",   desc: "위험 없음 · 가전 정상 대기" },
  auto_restore:      { ko: "정상 복귀",     cls: "bg-emerald-100 text-emerald-700", desc: "정상 등급 → 가전 전원 OFF 복귀" },
  auto_gentle:       { ko: "선제 약(弱)대응", cls: "bg-amber-100 text-amber-700",   desc: "주의 등급 → 공기청정 LOW 선제 가동" },
  auto:              { ko: "AI 자동 강(强)대응", cls: "bg-orange-100 text-orange-700", desc: "경계↑ → 공청 TURBO + 에어컨 송풍(Q_aux)" },
  approval_required: { ko: "관리자 승인 대기", cls: "bg-red-100 text-red-700",      desc: "심각 등급 → 관리자 승인 후 실행" },
  approved:          { ko: "승인 실행",     cls: "bg-red-100 text-red-700",        desc: "관리자 승인 완료 → 제어 실행" },
  manual:            { ko: "수동 모드",     cls: "bg-slate-200 text-slate-700",    desc: "관리자 직접 제어 — 자동 액추에이션 보류" },
};

function num(x: number | null | undefined, dp = 0) {
  return x == null ? "—" : (dp ? x.toFixed(dp) : Math.round(x).toString());
}
function pct(x: unknown, dp = 1) {
  return typeof x === "number" ? (x * 100).toFixed(dp) + "%" : "—";
}
function TierBadge({ t, dim }: { t: string; dim?: boolean }) {
  const m = TIER_META[t as Tier] ?? TIER_META.MONITOR;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${m.bg} ${m.text} ${dim ? "opacity-50" : ""}`}>
      {m.label}
    </span>
  );
}

// 번호 + 아이콘 헤더의 단계 카드
function Stage({ n, icon, title, children, active = true }:
  { n: number; icon: React.ReactNode; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <div className={`flex-1 min-w-[170px] rounded-xl p-4 border shadow-sm transition-colors ${active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-[#7a0024] text-white text-[11px] font-black flex items-center justify-center shrink-0">{n}</span>
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1">{icon}{title}</span>
      </div>
      {children}
    </div>
  );
}
function Arrow() {
  return <ChevronRight className="text-slate-300 shrink-0 self-center hidden xl:block" size={20} />;
}

export default function FlowPanel({ spaceId = "ward_a" }: { spaceId?: string }) {
  const { data: live, connected } = useLiveWard(spaceId);
  const boost = useExternalBoost();
  const plan = useControlPlan(spaceId, live?.tier);

  const fm = (live?.formula ?? {}) as Record<string, unknown>;
  const co2 = live?.co2_ppm ?? (typeof fm.co2 === "number" ? fm.co2 : null);
  const reb = (live?.rebreathed_fraction ?? (typeof fm.f === "number" ? fm.f : null)) as number | null;
  const poi = live?.poi ?? (typeof fm.poi === "number" ? fm.poi : null);
  const occ = (live?.occupancy ?? (typeof fm.n === "number" ? fm.n : null)) as number | null;
  const I = typeof fm.I === "number" ? fm.I : 1;
  const q = typeof fm.q === "number" ? fm.q : 30;
  const tH = typeof fm.t_h === "number" ? fm.t_h : 1;

  const finalTier = live?.tier ?? "MONITOR";
  const sensorTier = poiToTier(poi);                       // 센서발 기본 등급
  const boostActive = boost !== "MONITOR";
  const externalWon = (live?.tier_source === "external") || tierRank(boost) > tierRank(sensorTier);
  const gov = GOV_META[live?.governance ?? "none"] ?? GOV_META.none;
  const empty = occ === 0;

  return (
    <section className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Wind size={18} className="text-[#7a0024]" /> 자동 방역 의사결정 흐름
          <span className="text-xs font-normal text-slate-400 hidden sm:inline">외부신호 → 센서 → 계산 → 등급 → 가전</span>
        </h2>
        <span className={`text-xs font-semibold flex items-center gap-1 ${connected ? "text-emerald-600" : "text-slate-400"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          {connected ? "201호 실시간" : "연결 대기"}
        </span>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 xl:items-stretch">
        {/* ① 외부 감염 신호 */}
        <Stage n={1} icon={<Globe size={13} />} title="외부 감염 신호" active={boostActive}>
          <TierBadge t={boost} dim={!boostActive} />
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {boostActive
              ? `${live?.boost_region ?? "선택 지역"} 유행 감지 → 선제 boost`
              : "선택 지역 외부 신호 안정"}
          </p>
        </Stage>
        <Arrow />

        {/* ② 센서 실측 */}
        <Stage n={2} icon={<Activity size={13} />} title="센서 실측">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-500">CO₂</span><b className="text-right tabular-nums">{num(co2)}<span className="text-[10px] font-normal text-slate-400">ppm</span></b>
            <span className="text-slate-500 flex items-center gap-0.5"><Users size={11} />재실</span><b className="text-right tabular-nums">{occ ?? "—"}<span className="text-[10px] font-normal text-slate-400">명</span></b>
            <span className="text-slate-500">온/습</span><b className="text-right tabular-nums">{num(live?.temp_c, 1)}°/{num(live?.humidity)}%</b>
            <span className="text-slate-500">PM2.5</span><b className="text-right tabular-nums">{num(live?.pm25)}</b>
          </div>
        </Stage>
        <Arrow />

        {/* ③ 감염위험 계산 */}
        <Stage n={3} icon={<Sigma size={13} />} title="감염위험 계산">
          <div className="text-[10px] text-slate-400 mb-1">Rudnick-Milton (CO₂ 재호흡)</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">재호흡률 f</span>
            <b className="tabular-nums text-sm">{pct(reb, 2)}</b>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs text-slate-500">감염확률 PoI</span>
            <b className="tabular-nums text-base text-[#7a0024]">{pct(poi, 1)}</b>
          </div>
          {empty && <p className="text-[11px] text-emerald-600 mt-1 font-semibold">빈 병실 → 감염위험 0</p>}
        </Stage>
        <Arrow />

        {/* ④ 등급 결정 (max) */}
        <Stage n={4} icon={<ShieldCheck size={13} />} title="위험 등급 결정">
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-slate-400">센서</span><TierBadge t={sensorTier} dim={externalWon} />
            <span className="text-slate-300 font-bold">max</span>
            <span className="text-slate-400">외부</span><TierBadge t={boost} dim={!externalWon} />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-500">채택</span>
            <TierBadge t={finalTier} />
            <span className="text-[10px] text-slate-400">{externalWon ? "외부발" : "센서발"}</span>
          </div>
        </Stage>
        <Arrow />

        {/* ⑤ 거버넌스 + 가전 */}
        <Stage n={5} icon={<Wind size={13} />} title="자동 제어">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${gov.cls}`}>{gov.ko}</span>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{gov.desc}</p>
          {plan && plan.applied.length > 0 && (
            <ul className="mt-2 space-y-1 max-h-[96px] overflow-y-auto pr-1">
              {plan.applied.slice(0, 4).map((d) => (
                <li key={d.device} className="flex justify-between gap-2 text-[11px]">
                  <b className="text-slate-700 truncate">{d.name_kr}</b>
                  <span className="text-emerald-600 font-semibold shrink-0">{d.setting}</span>
                </li>
              ))}
            </ul>
          )}
        </Stage>
      </div>

      {/* 계산식 검증 바 — 라이브 값 대입 */}
      <div className="mt-4 rounded-xl bg-slate-900 text-slate-100 px-4 py-3 font-mono text-xs leading-relaxed overflow-x-auto">
        <div className="flex items-center gap-2 mb-1.5 font-sans text-[11px] text-slate-400 font-bold">
          <Sigma size={13} /> 계산식 검증 (실측값 대입)
        </div>
        <div className="whitespace-nowrap">
          <span className="text-sky-300">f</span> = (CO₂−{C_OUT})/{C_EXH} = ({num(co2)}−{C_OUT})/{C_EXH} = <b className="text-sky-200">{reb != null ? reb.toFixed(4) : "—"}</b>
        </div>
        <div className="whitespace-nowrap mt-0.5">
          <span className="text-rose-300">PoI</span> = 1−e^(−f·(I/n)·q·t) = 1−e^(−{reb != null ? reb.toFixed(3) : "—"}·({I}/{occ ?? "—"})·{q}·{tH}) = <b className="text-rose-200">{poi != null ? poi.toFixed(3) : "—"}</b> → <b className="text-amber-200">{(TIER_META[finalTier as Tier] ?? TIER_META.MONITOR).label}</b>
        </div>
      </div>

      {plan?.rationale && (
        <p className="text-xs text-slate-500 mt-3 pl-2 border-l-2 border-[#7a0024]/40">
          {plan.pathogen && <b className="text-slate-600">위협 {plan.pathogen} · {plan.season} · </b>}근거: {plan.rationale}
        </p>
      )}
    </section>
  );
}
