"use client";
/* 모니터1 — 실시간 UIS 지역 감염병 조기경보 지도 대시보드
 * 전 17개 시도 실시간 레벨 색칠 + 이름 + 전 지역 tier 색깔별 펄스(깜빡) + 색깔 분류 +
 * 실데이터 기반 AI 조기경보 리포트(라이브 폴링 10초) + 광주 클릭→경보 발령 데모 + 레이어 신호.
 */
import { useEffect, useRef, useState } from "react";
import { useExternalSignal, useBoostState, selectRegion, clearRegion } from "@/lib/useSentinel";

const CARD = "#1d2a3a", LINE = "#2c3a4d", MUTE = "#8aa0b6", FAINT = "#5d7088", ACCENT = "#36d399", GOLD = "#ffcf6b";
const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const LEVEL_COLOR: Record<string, string> = { RED: "#e2543b", ORANGE: "#f08c43", YELLOW: "#e0b341", GREEN: "#3a9d6b" };
const LEVEL_FILL: Record<string, string> = {
  RED: "rgba(226,84,59,0.55)", ORANGE: "rgba(240,140,67,0.45)", YELLOW: "rgba(224,179,65,0.30)", GREEN: "rgba(58,157,107,0.10)",
};
const LEVEL_EMOJI: Record<string, string> = { RED: "🔴", ORANGE: "🟠", YELLOW: "🟡", GREEN: "🟢" };
const LEVEL_KR: Record<string, string> = { RED: "심각", ORANGE: "경계", YELLOW: "주의", GREEN: "안정" };
const TIER_ORDER = ["RED", "ORANGE", "YELLOW", "GREEN"];
// tier별 펄스 주기(빠를수록 위험) — "전체 깜빡깜빡 + 색깔별 분류"
const PULSE_DUR: Record<string, number> = { RED: 1.2, ORANGE: 1.7, YELLOW: 2.3, GREEN: 3.4 };

const NAME_CODE: Record<string, string> = {
  "서울특별시": "11", "부산광역시": "26", "대구광역시": "27", "인천광역시": "28", "광주광역시": "29",
  "대전광역시": "30", "울산광역시": "31", "세종특별자치시": "36", "경기도": "41", "강원도": "42",
  "강원특별자치도": "42", "충청북도": "43", "충청남도": "44", "전라북도": "45", "전북특별자치도": "45",
  "전라남도": "46", "경상북도": "47", "경상남도": "48", "제주특별자치도": "50",
};
const SHORT = (n: string) => n.replace(/특별자치도|특별자치시|특별시|광역시|(?<=[가-힣])도$/g, "").trim() || n;

export default function EpidemicMap() {
  const [map, setMap] = useState<any>(null);
  const regions = useExternalSignal(10000); // 조기경보 실반영 — 10초 폴링
  const boost = useBoostState(3000);
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // 라이브 표시용 하트비트

  useEffect(() => {
    fetch(`${API_BASE}/korea_map.json`).then((r) => r.json()).then(setMap).catch(() => {});
  }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 10000); return () => clearInterval(t); }, []);

  const on = !!boost?.boost_tier && boost.boost_tier !== "MONITOR";

  // 실데이터 tier 매핑 + 색깔별 분류 집계
  const levelOf: Record<string, string> = {};
  regions.forEach((r: any) => { levelOf[r.region] = r.live_level || r.level || "GREEN"; });
  const effTier = (name: string) => (on && name === (boost?.region || "광주광역시")) ? "RED" : (levelOf[name] || "GREEN");

  const counts: Record<string, number> = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 };
  regions.forEach((r: any) => { counts[r.live_level || r.level || "GREEN"]++; });
  const sorted = [...regions].sort((a: any, b: any) => (b.live_score ?? 0) - (a.live_score ?? 0));
  const top = sorted[0];
  const maxTier = TIER_ORDER.find((t) => counts[t] > 0) || "GREEN";
  const anyAlert = counts.RED + counts.ORANGE + counts.YELLOW > 0;

  // 선택 지역: 경보 발령 중이면 그 지역, 아니면 실데이터 최고위험 지역
  const selName = on ? (boost?.region || "광주광역시") : (top?.region || "광주광역시");

  useEffect(() => {
    const code = NAME_CODE[selName] || "29";
    fetch(`${API_BASE}/api/sentinel/external/regional/${code}`).then((r) => r.json()).then(setDetail).catch(() => {});
  }, [selName, on, tick]);

  // 주차별 시계열(모델 종합점수 + 약국OTC·하수·검색 실신호) — 유행 곡선 라인그래프용
  const [series, setSeries] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/sentinel/external/series/${encodeURIComponent(selName)}?weeks=52`)
      .then((r) => r.json()).then((d) => setSeries(d?.points || [])).catch(() => {});
  }, [selName]);

  const sel = regions.find((r: any) => r.region === selName) as any;
  const selTier = effTier(selName);
  const layers = detail?.layers || {};
  const layerRows = [
    { k: "respiratory", label: "호흡기 (병의원·약국)", v: layers.respiratory },
    { k: "behavior", label: "행동 (검색·OTC 구매)", v: layers.behavior },
    { k: "environment", label: "환경 (하수 RNA·기온)", v: layers.environment },
  ];

  const narrate = (kind: "alert") => {
    // 동기 custom event: 클릭의 사용자 활성화 컨텍스트 안에서 부모가 원본 WAV를 재생한다.
    window.dispatchEvent(new CustomEvent("sentinel:narrate", { detail: kind }));
  };
  const fire = async () => {
    setBusy(true); narrate("alert");
    await selectRegion("광주광역시", "replay");
    setTimeout(() => setBusy(false), 900);
  };
  const off = async () => {
    setBusy(true);
    await clearRegion();
    setTimeout(() => setBusy(false), 900);
  };

  const gz = map?.provinces?.find((p: any) => p.name === "광주광역시");
  // 발령 시 SVG viewBox 를 광주 중심으로 부드럽게 줌 — CSS transform 과 달리 클리핑이 전혀 없다(고도화).
  // 경계 클램프로 지도가 프레임 밖으로 나가지 않아 어떤 화면비에서도 유연하게 들어맞는다.
  const vbRef = useRef<number[] | null>(null);
  const [vb, setVb] = useState<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const full = (map.viewBox as string).split(/\s+/).map(Number);
    if (!vbRef.current) { vbRef.current = full.slice(); setVb(full.join(" ")); }
    let target = full;
    if (on && gz) {
      const Z = 1.7, w = full[2] / Z, h = full[3] / Z;
      let x = gz.cx - w / 2, y = gz.cy - h / 2;
      x = Math.max(full[0], Math.min(x, full[0] + full[2] - w));
      y = Math.max(full[1], Math.min(y, full[1] + full[3] - h));
      target = [x, y, w, h];
    }
    const start = (vbRef.current ?? full).slice();
    const t0 = performance.now(), dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);  // easeOutCubic
      const cur = start.map((s, i) => s + (target[i] - s) * e);
      vbRef.current = cur; setVb(cur.join(" "));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, map, gz]);

  return (
    <div style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box", color: "#fff" }}>
      <style>{`
        @keyframes grow{from{width:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.30}}
        @keyframes cardpulse{0%,100%{box-shadow:0 0 0 0 rgba(226,84,59,0)}50%{box-shadow:0 0 18px 2px rgba(226,84,59,.55)}}
        @keyframes livedot{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 21, fontWeight: 800 }}>실시간 지역 감염병 조기경보 (UIS)</div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7fe0a8", fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#36d399", display: "inline-block", animation: "livedot 1.4s infinite" }} />
          LIVE · 10초 실반영
        </span>
        <span style={{ fontSize: 13, color: MUTE }}>전국 17개 시도 · 질병청 하수·검색·약국 OTC 융합</span>
        <button onClick={on ? off : fire} disabled={busy}
          style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, padding: "9px 18px", borderRadius: 10, border: "none",
                   cursor: busy ? "wait" : "pointer", color: "#fff", background: on ? "#e2543b" : "#2563eb" }}>
          {busy ? "처리 중…" : on ? "■ 경보 해제" : "▶ 광주광역시 경보 발령"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,720px) minmax(380px,560px)", justifyContent: "center", gap: 16, flex: 1, minHeight: 0, width: "100%" }}>
        {/* 지도 */}
        <div style={{ background: CARD, border: `1px solid ${on ? "#e2543b" : LINE}`, borderRadius: 14, padding: 8, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!map ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: FAINT }}>지도 로딩…</div> : (
            <svg viewBox={vb ?? map.viewBox} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
            <g>
              {map.provinces.map((p: any) => {
                const lv = effTier(p.name);
                const isGwangju = p.name === "광주광역시";
                const hot = isGwangju && on;
                return (
                  <g key={p.code} style={{ cursor: "pointer" }} onClick={() => isGwangju && (on ? off() : fire())}>
                    <path d={p.d} fill={hot ? "rgba(226,84,59,0.6)" : LEVEL_FILL[lv]}
                      stroke={hot ? "#fff" : LEVEL_COLOR[lv]} strokeWidth={hot ? 2 : 1} />
                  </g>
                );
              })}
              {/* 지역명 라벨 */}
              {map.provinces.map((p: any) => (
                <text key={"t" + p.code} x={p.cx} y={p.cy + 13} textAnchor="middle" fontSize="12"
                  fill={p.name === selName ? "#cfe0f5" : "#8aa0b6"}
                  fontWeight={p.name === selName ? 800 : 500} style={{ pointerEvents: "none" }}>
                  {SHORT(p.name)}
                </text>
              ))}
              {/* 전 지역 tier 색깔별 펄스 마커 (깜빡) */}
              {map.provinces.map((p: any) => {
                const lv = effTier(p.name);
                const c = LEVEL_COLOR[lv];
                const dur = `${PULSE_DUR[lv]}s`;
                const elevated = lv !== "GREEN";
                return (
                  <g key={"pulse" + p.code} transform={`translate(${p.cx},${p.cy - 20})`} style={{ pointerEvents: "none" }}>
                    {elevated && [0, 1].map((k) => (
                      <circle key={k} r="5" fill="none" stroke={c} strokeWidth="2.5" opacity="0">
                        <animate attributeName="r" values="5;34" dur={dur} begin={`${k * 0.7}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0" dur={dur} begin={`${k * 0.7}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                    <circle r={elevated ? 6 : 4} fill={c} stroke="#fff" strokeWidth="1.3">
                      <animate attributeName="opacity" values="1;0.3;1" dur={dur} repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              })}
            </g>
            </svg>
          )}
          {/* 범례 (색깔별 분류) */}
          <div style={{ position: "absolute", bottom: 12, left: 14, display: "flex", gap: 12, fontSize: 12, color: MUTE }}>
            {TIER_ORDER.map((l) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: LEVEL_COLOR[l], display: "inline-block" }} />{l} {LEVEL_KR[l]} ({counts[l]})
              </span>
            ))}
          </div>
        </div>

        {/* 우측: 실데이터 조기경보 리포트 + 색깔 분류 + 레이어 신호 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {/* AI 조기경보 리포트 — 실데이터 라이브 */}
          <div style={{ background: (on || anyAlert) ? "rgba(226,84,59,0.10)" : CARD,
                        border: `1px solid ${(on || anyAlert) ? LEVEL_COLOR[on ? "RED" : maxTier] : LINE}`, borderRadius: 14, padding: 16,
                        animation: (on || counts.RED > 0) ? "cardpulse 1.6s infinite" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: (on || anyAlert) ? "#ff9b85" : ACCENT }}>🤖 AI 조기경보 리포트</span>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#36d399", display: "inline-block", animation: "livedot 1.4s infinite" }} />
              <span style={{ fontSize: 11, color: FAINT }}>실시간 반영</span>
            </div>

            {/* 색깔별 분류 칩 */}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {TIER_ORDER.map((t) => {
                const active = counts[t] > 0 && t !== "GREEN";
                return (
                  <div key={t} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: "7px 4px",
                        background: counts[t] > 0 ? LEVEL_FILL[t] : "#0f1722", border: `1px solid ${LEVEL_COLOR[t]}`,
                        animation: active ? `blink ${PULSE_DUR[t]}s infinite` : "none" }}>
                    <div style={{ fontSize: 19, fontWeight: 900, color: LEVEL_COLOR[t], lineHeight: 1 }}>{counts[t]}</div>
                    <div style={{ fontSize: 10, color: MUTE, marginTop: 3 }}>{t} {LEVEL_KR[t]}</div>
                  </div>
                );
              })}
            </div>

            {/* 최고위험 지역 (실데이터) */}
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 12 }}>
              {selName} {LEVEL_EMOJI[selTier]} <span style={{ fontSize: 13, color: MUTE, fontWeight: 700 }}>{LEVEL_KR[selTier]}</span>
            </div>
            <div style={{ fontSize: 14, color: "#dfe7f0", marginTop: 6, lineHeight: 1.6 }}>
              <b>인플루엔자</b> 위험도 <b style={{ color: GOLD }}>{sel?.live_score?.toFixed?.(0) ?? detail?.composite_score?.toFixed?.(0) ?? "—"}</b>점
              {sel?.peak_score != null && <> · 시즌피크 <b style={{ color: GOLD }}>{sel.peak_score.toFixed(0)}</b>점</>}<br />
              {on
                ? <span>호흡기·행동 신호 동반 상승 — <b style={{ color: "#ff9b85" }}>RED 임박</b>. 병동 선제 환기·청정 강화 권고.</span>
                : anyAlert
                  ? <span><b style={{ color: LEVEL_COLOR[maxTier] }}>{maxTier} {LEVEL_KR[maxTier]}</b> {counts[maxTier]}개 지역 감지 — 최고위험 <b>{top?.region}</b>. 신호 추이 실시간 추적 중.</span>
                  : <span style={{ color: MUTE }}>전국 <b style={{ color: ACCENT }}>안정(GREEN)</b> · 인플루엔자 비유행기. 3계층 신호 실시간 모니터링 중 — 상승 시 자동 경보.</span>}
            </div>
          </div>

          {/* 유행 추이 — 모델 종합점수 + 약국OTC·하수·검색 실신호 (시계열 라인) */}
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>유행 추이 — {SHORT(selName)}
              <span style={{ fontSize: 11, color: FAINT, fontWeight: 500 }}> · 최근 1년 실데이터</span></div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 700, margin: "2px 0 6px" }}>
              <span style={{ color: "#e2543b" }}>━ 종합(모델)</span>
              <span style={{ color: "#ffcf6b" }}>━ 약국OTC</span>
              <span style={{ color: "#5b9dff" }}>━ 하수</span>
              <span style={{ color: "#36d399" }}>━ 검색</span>
            </div>
            <TrendChart points={series} />
            <div style={{ fontSize: 11, color: FAINT, marginTop: 4, lineHeight: 1.5 }}>
              모델 종합점수가 3계층 실신호(약국·하수·검색)로 유행을 추종 — <b>겨울 피크 → 현재 비수기</b>. 점선=RED 임계(75). (외부 UIS 실데이터)
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: FAINT }}>정직 고지: 예측 모델(F1 0.907)은 외부 UIS 소유 · 우리는 라스트마일(병동 선제대응). 검색 단독 선행성은 미주장. L1·L3는 전국값 17지역 broadcast(L2 하수만 지역차).</div>
    </div>
  );
}

// 주차별 유행 추이 — 모델 종합점수(굵은 빨강 area)와 3계층 실신호(약국OTC·하수·검색).
// 5주 이동평균으로 스무딩 → 노이즈·세로스파이크 제거, 자연스러운 유행 곡선.
function TrendChart({ points }: { points: any[] }) {
  if (!points || !points.length)
    return <div style={{ flex: 1, display: "grid", placeItems: "center", color: FAINT, fontSize: 12 }}>시계열 로딩…</div>;
  const W = 320, H = 144, PADL = 20, PADT = 6, PADB = 2;
  const iw = W - PADL, ih = H - PADT - PADB;
  const n = points.length;
  const smooth = (key: string, w = 5) => points.map((_p, i) => {
    const a = Math.max(0, i - (w >> 1)), b = Math.min(n, i + (w >> 1) + 1);
    let s = 0, c = 0;
    for (let j = a; j < b; j++) { s += points[j][key] ?? 0; c++; }
    return c ? s / c : 0;
  });
  const xs = (i: number) => PADL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const ys = (v: number) => PADT + (1 - Math.max(0, Math.min(100, v)) / 100) * ih;
  const toLine = (arr: number[]) => arr.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const comp = smooth("composite");
  const sig = [{ k: "otc", c: "#ffcf6b" }, { k: "wastewater", c: "#5b9dff" }, { k: "search", c: "#36d399" }]
    .map((s) => ({ ...s, arr: smooth(s.k) }));
  let pi = 0; comp.forEach((v, i) => { if (v > comp[pi]) pi = i; });
  const area = `${PADL.toFixed(1)},${ys(0).toFixed(1)} ${toLine(comp)} ${xs(n - 1).toFixed(1)},${ys(0).toFixed(1)}`;
  return (
    <div style={{ flex: 1, minHeight: 90, display: "flex", flexDirection: "column" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", flex: 1, minHeight: 0 }}>
        <defs>
          <linearGradient id="trendComp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2543b" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#e2543b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* RED 임계선 75 */}
        <line x1={PADL} x2={W} y1={ys(75)} y2={ys(75)} stroke="#e2543b" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5" />
        <text x={1} y={ys(75) + 3} fontSize="7.5" fill="#e2543b">75</text>
        {/* 종합(모델) area */}
        <polygon points={area} fill="url(#trendComp)" />
        {/* 실신호 3종(얇게·반투명) */}
        {sig.map((s) => (
          <polyline key={s.k} points={toLine(s.arr)} fill="none" stroke={s.c} strokeWidth="1"
            vectorEffect="non-scaling-stroke" opacity="0.42" />
        ))}
        {/* 종합(모델) 굵은 라인 + 피크 */}
        <polyline points={toLine(comp)} fill="none" stroke="#e2543b" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
        <circle cx={xs(pi)} cy={ys(comp[pi])} r="3" fill="#e2543b" stroke="#fff" strokeWidth="1.2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5d7088", paddingLeft: 20, marginTop: 2 }}>
        <span>1년 전</span><span>겨울 피크 ▲</span><span>현재</span>
      </div>
    </div>
  );
}
