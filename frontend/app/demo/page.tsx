"use client";
/* ThinQ Workspace Sentinel — 3분할 키오스크 데모 대시보드
 *
 * 모니터마다 같은 URL + 다른 screen 파라미터로 띄운다:
 *   /demo?screen=sensor     (모니터1) 실시간 센서 + 알고리즘 파이프라인
 *   /demo?screen=appliance  (모니터2) 가전 제어 (코웨이만 실연동, 나머지 시뮬)
 *   /demo?screen=epidemic   (모니터3) 외부 역학 + 선제발령 토글 + 기존vs우리
 *   &voice=1  → 이 화면에서 상태 전이 시 녹음 내레이션 (조작자 화면 1개에만 권장)
 *
 * 데이터: lib/useSentinel 훅 재사용(실 RPi SSE·control-plan·external boost).
 * 정직성: 코웨이 공기청정기 1종만 실제 제어 실증 — 나머지 가전은 '제어계획(시뮬)'.
 *         "감염 막는다" 금지 → "위험 낮춤·선제 준비". 활력징후 미수집(비의료).
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useLiveWard, useControlPlan, useSensorSeries, useRiskSeries,
  useBoostState, useExternalSignal, useCowayStatus,
  selectRegion, clearRegion,
  type ControlPlanDevice,
} from "@/lib/useSentinel";
import { tierMeta, tierRank } from "@/lib/tier";
import ControlRoom from "./ControlRoom";
import EpidemicMap from "./EpidemicMap";

// ── 데모 상수 ───────────────────────────────────────────────
const DEMO_REGION = "광주광역시";
const SPACE = "ward_a";
const REAL_DEVICE = "AIR_PURIFIER"; // 코웨이 = 유일한 실연동 기기
// 노트북 카메라 YOLO MJPEG 스트림(Tailscale). camera_laptop.py 실행 시 활성.
const CAM_URL = process.env.NEXT_PUBLIC_CAM_URL || "http://100.79.201.49:8089/video.mjpg";

const INK = "#0f1722", PANEL = "#16212e", CARD = "#1d2a3a", LINE = "#2c3a4d";
const MUTE = "#8aa0b6", FAINT = "#5d7088", ACCENT = "#36d399", BLUE = "#5b9dff";

// ── 녹음 내레이션 — mav 원본 WAV만 순서대로 재생 ───────────
type NarrationKind = "alert" | "risk-rise" | "restore";
let activeNarration: HTMLAudioElement | null = null;
const narrationQueue: NarrationKind[] = [];

function drainNarrationQueue() {
  if (activeNarration || narrationQueue.length === 0) return;
  const kind = narrationQueue.shift()!;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const files: Record<NarrationKind, string> = {
    alert: "mav-take1-20260623.wav",
    "risk-rise": "mav-take2-20260623.wav",
    restore: "mav-take3-20260623.wav",
  };
  const audio = new Audio(`${base}/audio/${files[kind]}?v=2`);
  audio.preload = "auto";
  audio.volume = 1;
  activeNarration = audio;
  const done = () => {
    activeNarration = null;
    drainNarrationQueue();
  };
  audio.addEventListener("ended", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  void audio.play().catch((error) => {
    console.error(`[Sentinel narration] ${kind}.wav 재생 실패`, error);
    done();
  });
}

function playNarration(kind: NarrationKind) {
  // 동일 파일 중복 큐잉 방지. 기존 Web Speech/옛 음성 폴백은 사용하지 않는다.
  if (narrationQueue[narrationQueue.length - 1] === kind) return;
  narrationQueue.push(kind);
  drainNarrationQueue();
}

/** 백엔드 실센서 상태기계 이벤트 ID에 맞춰 Take2/Take3를 정확히 한 번 큐잉. */
function useControlNarration(controlEvent: string | null | undefined, controlEventId: number | null | undefined, enabled: boolean) {
  const lastId = useRef<number | null>(null);
  useEffect(() => {
    if (!controlEvent || controlEventId == null || controlEventId === lastId.current) return;
    lastId.current = controlEventId;
    if (!enabled) return;
    if (controlEvent === "activated") playNarration("risk-rise");
    else if (controlEvent === "recovered") playNarration("restore");
  }, [controlEvent, controlEventId, enabled]);
}

// ── 라벨 차트 (X/Y축·그리드·현재값) — 카드 높이를 꽉 채우는 반응형 ──────────
function Chart({ values, color, unit = "", fix = 0 }: { values: number[]; color: string; unit?: string; fix?: number }) {
  if (!values.length) return <div style={{ flex: 1, color: FAINT, fontSize: 13, display: "grid", placeItems: "center" }}>데이터 수집 중…</div>;
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || Math.max(1, Math.abs(max) * 0.1);
  const pad = span * 0.18, lo = min - pad, hi = max + pad, range = (hi - lo) || 1;  // Y 여백(쏠림 방지)
  const last = values[values.length - 1];
  const W = 400, H = 100;  // viewBox 임의단위, preserveAspectRatio=none 으로 카드에 꽉 차게 스트레치
  const pts = values.map((v, i) => `${(i / (values.length - 1 || 1) * W).toFixed(1)},${((1 - (v - lo) / range) * H).toFixed(2)}`).join(" ");
  const fmt = (n: number) => n.toFixed(fix);
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 110, display: "flex", paddingBottom: 18, marginTop: 8 }}>
      <div style={{ width: 50, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 11, color: FAINT, textAlign: "right", paddingRight: 6 }}>
        <span>{fmt(hi)}{unit}</span><span>{fmt((hi + lo) / 2)}{unit}</span><span>{fmt(lo)}{unit}</span>
      </div>
      <div style={{ position: "relative", flex: 1, borderLeft: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px)`, backgroundSize: `100% 33.33%`, opacity: 0.5 }} />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ position: "absolute", right: 8, top: 6, fontSize: 17, fontWeight: 800, color }}>{fmt(last)}{unit}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -18, display: "flex", justifyContent: "space-between", fontSize: 11, color: FAINT }}>
          <span>30분 전</span><span>15분 전</span><span>현재</span>
        </div>
      </div>
    </div>
  );
}

// ── 공통 헤더 (모든 화면) ───────────────────────────────────
function TopBar({ screen, connected, boostOn, busy, onToggle }: {
  screen: string; connected: boolean; boostOn: boolean; busy: boolean; onToggle: () => void;
}) {
  const tabs = [
    { k: "epidemic", label: "① 외부 역학" },
    { k: "control", label: "② 관제 (병동·가전)" },
    { k: "sensor", label: "③ 센서·알고리즘" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 26px", borderBottom: `1px solid ${LINE}`, background: PANEL }}>
      <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: -0.4 }}>
        ThinQ <span style={{ color: ACCENT }}>Workspace Sentinel</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
        {tabs.map((t) => (
          <a key={t.k} href={`/demo?screen=${t.k}${screen === t.k ? "" : ""}`}
             style={{ fontSize: 14, padding: "6px 12px", borderRadius: 8, textDecoration: "none",
                      color: screen === t.k ? INK : MUTE, background: screen === t.k ? ACCENT : "transparent",
                      fontWeight: screen === t.k ? 700 : 500 }}>{t.label}</a>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontSize: 13, color: connected ? ACCENT : "#e2543b", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: connected ? ACCENT : "#e2543b",
                         display: "inline-block", animation: connected ? "pulse 1.6s infinite" : "none" }} />
          {connected ? "실시간 연결" : "재연결 중"}
        </span>
        <button onClick={onToggle} disabled={busy}
          style={{ fontSize: 15, fontWeight: 800, padding: "10px 20px", borderRadius: 10, border: "none",
                   cursor: busy ? "wait" : "pointer", color: "#fff",
                   background: boostOn ? "#e2543b" : "#2563eb", boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}>
          {busy ? "처리 중…" : boostOn ? "■ 경보 해제 (평소복귀)" : "▶ 외부 조기경보 발령"}
        </button>
      </div>
    </div>
  );
}

// ── 화면 ① 센서 + 알고리즘 파이프라인 ──────────────────────
function SensorScreen({ live, series, risk, boostActive }: any) {
  const tier = live?.tier ?? "MONITOR";
  const tm = tierMeta(tier);
  const co2 = live?.co2_ppm ?? null;
  // f: 실시간 값 우선, 없으면 동일 공식으로 계산(파이프라인이 "—"로 비지 않게) — Cₐ=420 외기·C₀=38000 호기
  const f = live?.rebreathed_fraction ?? (co2 != null ? Math.max(0, (co2 - 420) / 38000) : null);
  const poi = live?.poi ?? null;
  const occ = live?.occupancy ?? null;
  const ext = !!boostActive || live?.tier_source === "external";

  const PipeBox = ({ label, value, sub, cite, hl }: any) => (
    <div style={{ flex: 1, minWidth: 0, background: CARD, border: `1px solid ${hl ? ACCENT : LINE}`,
                  borderRadius: 14, padding: "16px 18px", position: "relative" }}>
      <div style={{ fontSize: 13, color: MUTE, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: FAINT, marginTop: 4, fontFamily: "monospace" }}>{sub}</div>}
      {cite && <div style={{ fontSize: 11, color: BLUE, marginTop: 6 }}>{cite}</div>}
    </div>
  );
  const Arrow = () => <div style={{ color: ACCENT, fontSize: 26, alignSelf: "center", padding: "0 2px" }}>→</div>;

  return (
    <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 20, height: "100%", boxSizing: "border-box" }}>
      {/* 대형 티어 배지 */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ background: tm.border, color: "#fff", borderRadius: 18, padding: "20px 34px",
                      minWidth: 240, textAlign: "center", boxShadow: `0 8px 30px ${tm.border}55` }}>
          <div style={{ fontSize: 16, opacity: 0.9 }}>현재 감염위험 등급</div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.05 }}>{tm.emoji} {tm.label}</div>
          <div style={{ fontSize: 14, opacity: 0.92, marginTop: 4 }}>
            {ext ? `외부 조기경보 선제 상향 (${live?.boost_region ?? DEMO_REGION})` : "실내 센서 감지"}
          </div>
        </div>
        {/* 재실 인원 — 카메라 실측 (강조) */}
        <div style={{ background: CARD, border: `1px solid ${ACCENT}`, borderRadius: 16, padding: "16px 22px",
                      textAlign: "center", minWidth: 150, boxShadow: `0 0 0 1px ${ACCENT}44` }}>
          <div style={{ fontSize: 13, color: MUTE }}>재실 인원</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1.05 }}>
            {occ != null ? occ : "—"}<span style={{ fontSize: 18, color: MUTE, fontWeight: 600 }}> 명</span>
          </div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>● 카메라 실측 (실시간)</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>실시간 센서 — 201호</div>
          <div style={{ fontSize: 15, color: MUTE, marginTop: 6, lineHeight: 1.5 }}>
            <b style={{ color: ACCENT }}>재실 인원은 카메라가 실제로 측정</b>합니다(실측). CO₂·온습도는 실시간 환경 신호로
            <b style={{ color: "#fff" }}> 재호흡분율 → 감염확률</b>을 매초 산출합니다.
            {ext && <span style={{ color: "#ffcf6b" }}> · 센서는 정상이지만 외부 위험으로 기준선이 선제 상향됨</span>}
          </div>
        </div>
      </div>

      {/* 사전예방 모드 배너 — 외부 조기경보 발령 시 */}
      {ext && (
        <div style={{ background: "rgba(255,207,107,0.12)", border: "1px solid rgba(255,207,107,0.45)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <span style={{ fontSize: 14, color: "#ffcf6b", fontWeight: 800 }}>감염병 사전예방 모드</span>
          <span style={{ fontSize: 13, color: "#dfe7f0" }}>외부 조기경보(광주 인플루엔자)로 위험 판정 기준을 선제 상향 — 같은 환경도 더 보수적으로 판정합니다.</span>
        </div>
      )}

      {/* 파이프라인 */}
      <div>
        <div style={{ fontSize: 14, color: MUTE, marginBottom: 8, fontWeight: 700 }}>판정 파이프라인 (논문 기반 · 실시간)
          <span style={{ fontSize: 12, color: FAINT, fontWeight: 500 }}> · 전파 위험확률은 상시 계산 / 등급은 외부 감염 조기경보 발령 시 이 확률로 격상</span></div>
        <div style={{ display: "flex", gap: 6 }}>
          <PipeBox label="CO₂ 농도" value={co2 != null ? `${Math.round(co2)} ppm` : "—"} sub="실측 (MH-Z19)" />
          <Arrow />
          <PipeBox label="재호흡분율 f" value={f != null ? f.toFixed(4) : "—"} sub="f=(C−Cₐ)/C₀" cite="Rudnick-Milton 2003" />
          <Arrow />
          <PipeBox label="전파 위험확률 PoI" value={poi != null ? `${(poi * 100).toFixed(1)}%` : "—"} sub="감염자 노출 시 · 1−exp(−f·(I/n)·q·t)" cite="Wells-Riley" />
          <Arrow />
          <PipeBox label="5-Tier 등급" value={`${tm.emoji} ${tm.label}`} sub={ext ? "외부경보 → PoI로 격상" : "평상 감시(지역 신호 없음)"} cite="Kim et al. 2025" hl />
        </div>
      </div>

      {/* 카메라(YOLO) + 그래프 2종 */}
      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        <CameraPanel occ={live?.occupancy} />
        <div style={{ flex: 1, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>CO₂ 추이 <span style={{ color: FAINT, fontSize: 12 }}>({series?.source || "실측"})</span></div>
          <Chart values={(series?.points ?? []).map((p: any) => p.co2).filter((v: any) => v != null)} color={BLUE} unit="ppm" fix={0} />
        </div>
        <div style={{ flex: 1, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>감염확률 PoI 추이 <span style={{ color: FAINT, fontSize: 12 }}>(Rudnick-Milton)</span></div>
          <Chart values={(risk?.points ?? []).map((p: any) => (p.poi ?? 0)).filter((v: any) => v != null)} color={ACCENT} unit="%" fix={1} />
        </div>
      </div>
    </div>
  );
}

// 노트북 카메라 YOLO 실시간 영상 (MJPEG 임베드 + 끊김 폴백)
function CameraPanel({ occ }: { occ?: number | null }) {
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => { const t = setTimeout(() => { if (!ok) setErr(true); }, 4000); return () => clearTimeout(t); }, [ok]);
  return (
    <div style={{ flex: 1.25, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>실시간 카메라 <span style={{ color: ACCENT, fontSize: 12 }}>● YOLO 사람 검출</span>
        {occ != null && <span style={{ float: "right", color: ACCENT, fontWeight: 800 }}>재실 {occ}명</span>}</div>
      <div style={{ flex: 1, marginTop: 10, borderRadius: 10, overflow: "hidden", background: "#0a0f16", display: "grid", placeItems: "center", minHeight: 130 }}>
        {err
          ? <div style={{ textAlign: "center", color: FAINT, fontSize: 13, lineHeight: 1.6 }}>📷 카메라 스트림 대기<br /><span style={{ fontSize: 11 }}>노트북에서 camera_laptop.py 실행 시<br />YOLO 실시간 영상(박스)이 표시됩니다</span></div>
          : <img src={CAM_URL} onLoad={() => setOk(true)} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="YOLO" />}
      </div>
      <div style={{ fontSize: 12, color: FAINT, marginTop: 6 }}>재실 인원 = YOLO person 검출 수 (실측 → PoI 분모)</div>
    </div>
  );
}

// ── 화면 ② 가전 제어 (코웨이만 실연동) ─────────────────────
function ApplianceScreen({ plan, coway, tier }: any) {
  const tm = tierMeta(tier);
  const applied: ControlPlanDevice[] = plan?.applied ?? [];
  const skipped: ControlPlanDevice[] = plan?.skipped ?? [];
  // 가전 가동 강도(intensity) 시계열 — 경보 시 0.3→1.0+ 로 상승하는 추이.
  const intensity = plan?.intensity ?? 0.3;
  const [hist, setHist] = useState<number[]>([]);
  useEffect(() => { const t = setInterval(() => setHist((h) => [...h.slice(-44), intensity]), 1500); return () => clearInterval(t); }, [intensity]);
  // 풍량 막대는 "계획 세팅"(목표) 기준 — 실기기 fan_speed(99=auto 센티넬)에 흔들리지 않게.
  const SET_LEVEL: Record<string, number> = { "대기": 1, LOW: 2, MED: 3, HIGH: 4, TURBO: 5 };
  const realOn = !!coway?.is_on && (coway?.fan_speed ?? 99) <= 5;

  const Card = ({ d }: { d: ControlPlanDevice }) => {
    const real = d.device === REAL_DEVICE;
    const bars = Object.entries(SET_LEVEL).find(([k]) => (d.setting || "").includes(k))?.[1] ?? 3;
    return (
      <div style={{ background: CARD, border: `1px solid ${real ? ACCENT : LINE}`, borderRadius: 14, padding: 18,
                    position: "relative", boxShadow: real ? `0 0 0 1px ${ACCENT}55` : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{d.name_kr}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                         color: real ? INK : MUTE, background: real ? ACCENT : "rgba(255,255,255,0.07)",
                         border: real ? "none" : `1px solid ${LINE}` }}>
            {real ? "● 실연동 (코웨이)" : "제어계획 (시뮬)"}
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: real ? ACCENT : "#dfe7f0", marginTop: 8 }}>{d.setting ?? "—"}</div>
        <div style={{ fontSize: 13, color: FAINT, marginTop: 6, lineHeight: 1.4 }}>{d.reason}</div>
        {real && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 36 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ flex: 1, height: `${i * 20}%`, borderRadius: 3,
                                      background: i <= bars ? ACCENT : "rgba(255,255,255,0.08)",
                                      animation: i <= bars ? `rise 0.9s ${i * 0.08}s ease both` : "none" }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: MUTE, marginTop: 6 }}>
              {coway?.available
                ? (realOn
                    ? `IoCare 연결 · 실기기 가동중 (풍량 ${coway?.fan_speed}/5)`
                    : "IoCare 연결됨 · 실작동 스위치 OFF(난무 방지) — 시연은 계획 표시")
                : "IoCare 연결 대기"}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18, height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>가전 자동 제어 — {plan?.pathogen ?? "—"} 프로토콜</div>
        <span style={{ background: tm.border, color: "#fff", borderRadius: 8, padding: "5px 14px", fontWeight: 800 }}>{tm.emoji} {tm.label}</span>
        <span style={{ fontSize: 14, color: MUTE }}>{plan?.rationale}</span>
      </div>
      <div style={{ fontSize: 13, color: "#ffcf6b" }}>
        ⚠ 실제 제어 실증은 <b>코웨이 공기청정기 1종</b>뿐입니다. 나머지 가전은 어댑터 연동 예정(현재 제어계획·시뮬 표시).
      </div>

      {/* 가전 가동 강도 추이 — 경보 시 상승 */}
      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, height: 150, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>가전 가동 강도 추이 <span style={{ color: FAINT, fontSize: 12 }}>(환기·공청·에어컨 종합 — 경보 시 상승)</span>
          <span style={{ float: "right", color: tm.border, fontWeight: 800 }}>현재 ×{intensity.toFixed(2)}</span></div>
        <Chart values={hist.length ? hist : [intensity]} color="#5b9dff" unit="x" fix={2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, flex: 1 }}>
        {applied.map((d) => <Card key={d.device} d={d} />)}
      </div>

      {skipped.length > 0 && (
        <div style={{ background: "rgba(226,84,59,0.08)", border: "1px solid rgba(226,84,59,0.3)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ff9b85" }}>근거 없음 → 자동 제외</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>
            {skipped.map((d) => `${d.name_kr}(${d.reason})`).join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 한국 지도 (TopoJSON→SVG, /korea_map.json) ─────────────────
function KoreaMap({ on }: { on: boolean }) {
  const [map, setMap] = useState<any>(null);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/korea_map.json`).then((r) => r.json()).then(setMap).catch(() => {});
  }, []);
  if (!map) return <div style={{ display: "grid", placeItems: "center", color: FAINT, height: "100%" }}>지도 로딩…</div>;
  const gj = map.provinces.find((p: any) => p.name === "광주광역시");
  return (
    <svg viewBox={map.viewBox} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      {map.provinces.map((p: any) => {
        const hot = p.name === "광주광역시" && on;
        return <path key={p.code} d={p.d}
          fill={hot ? "rgba(226,84,59,0.5)" : "rgba(91,157,255,0.06)"}
          stroke={hot ? "#e2543b" : "rgba(120,150,190,0.35)"} strokeWidth={hot ? 2 : 0.7} />;
      })}
      {gj && (
        <g transform={`translate(${gj.cx},${gj.cy})`}>
          {on && [0, 1, 2].map((k) => (
            <circle key={k} r="6" fill="none" stroke="#e2543b" strokeWidth="2.5" opacity="0">
              <animate attributeName="r" values="6;48" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <circle r="9" fill={on ? "#e2543b" : "#5b9dff"} stroke="#fff" strokeWidth="2" />
          <text y="-20" textAnchor="middle" fontSize="22" fontWeight="800" fill={on ? "#ff9b85" : "#9fb3cc"}>광주</text>
        </g>
      )}
    </svg>
  );
}

// ── 화면 ① 외부 역학 (지도) + 차별점 ──────────────────────────
function EpidemicScreen({ boost, regions }: any) {
  const info = (boost?.info ?? {}) as any;
  const region = boost?.region;
  const on = boost?.boost_tier && boost.boost_tier !== "MONITOR";
  const gj = regions?.find?.((r: any) => r.region === DEMO_REGION) ?? info;

  const rows = [
    ["신호 출처", "실내 센서만", "외부 역학 선행 + 실내 센서"],
    ["대응 시점", "사후 (발생 후)", "선제 (증상 전)"],
    ["출력", "경보·대시보드", "실제 가전 자동제어"],
    ["판정 근거", "임의 임계값", "논문 수식 노출"],
    ["가전", "자사 BMS 종속", "벤더무관"],
  ];

  return (
    <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, height: "100%", boxSizing: "border-box" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
        외부 감염병 조기경보 — 선제 대응 {on && <span style={{ color: "#ff9b85" }}>· 발령 중</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        {/* 지도 */}
        <div style={{ background: CARD, border: `1px solid ${on ? "#e2543b" : LINE}`, borderRadius: 14, padding: 10, position: "relative" }}>
          <div style={{ position: "absolute", top: 14, left: 16, fontSize: 13, color: MUTE, zIndex: 1 }}>실시간 지역 감염병 지도</div>
          <KoreaMap on={!!on} />
        </div>
        {/* 우측 정보 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ background: on ? "rgba(226,84,59,0.12)" : CARD, border: `1px solid ${on ? "#e2543b" : LINE}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, color: MUTE }}>발령 지역</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>{region ?? DEMO_REGION} {on ? "🔴" : "🟢"}</div>
            <div style={{ fontSize: 14, color: "#dfe7f0", marginTop: 6, lineHeight: 1.6 }}>
              질환 <b>{(gj?.disease ?? "influenza") === "influenza" ? "인플루엔자" : gj?.disease}</b> · 확진피크 <b style={{ color: "#ffcf6b" }}>{gj?.lead_days ?? 21}일 전</b> 조기 신호<br />
              <span style={{ fontSize: 12, color: FAINT }}>출처: 질병청 하수·검색·약국 OTC 복합 (외부 UIS)</span>
            </div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, color: MUTE }}>선제 격상 메커니즘</div>
            <div style={{ fontFamily: "monospace", fontSize: 17, color: "#fff", marginTop: 6 }}>tier = max(센서, 외부boost)</div>
            <div style={{ fontSize: 13, color: "#dfe7f0", marginTop: 8, lineHeight: 1.5 }}>센서 정상이어도 외부 위험↑면 <b style={{ color: ACCENT }}>더 보수적으로</b> 판정. <span style={{ color: FAINT }}>센서가 민감해지는 게 아니라 기준선이 선제 상향.</span></div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 8 }}>기존 vs ThinQ Sentinel</div>
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.2fr" }}>
              <Cell head>구분</Cell><Cell head>기존</Cell><Cell head hl>Sentinel</Cell>
              {rows.map((r, i) => (<Frag key={i}><Cell>{r[0]}</Cell><Cell dim>{r[1]}</Cell><Cell hl>{r[2]}</Cell></Frag>))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: FAINT, lineHeight: 1.5 }}>
        정직 고지: 환자 활력징후 미수집(비의료) · 실제 제어 실증은 코웨이 1종 · “막는다” 아닌 “위험 낮춤·선제 준비” · 예측 F1 0.907은 외부 UIS.
      </div>
    </div>
  );
}
const Frag = ({ children }: any) => <>{children}</>;
function Cell({ children, head, hl, dim }: any) {
  return (
    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, fontSize: 14,
                  fontWeight: head ? 800 : 600, color: head ? "#fff" : hl ? ACCENT : dim ? FAINT : "#dfe7f0",
                  background: hl && !head ? "rgba(54,211,153,0.06)" : head ? "rgba(255,255,255,0.04)" : "transparent" }}>
      {children}
    </div>
  );
}

// ── 페이지 ──────────────────────────────────────────────────
function DemoInner() {
  const params = useSearchParams();
  const screen = params.get("screen") || "sensor";
  // 외부역학 조작 화면은 기본 음성 ON. 명시적으로 voice=0일 때만 끈다.
  const voice = params.get("voice") === "1" || (screen === "epidemic" && params.get("voice") !== "0");

  const { data: live, connected, lastTs } = useLiveWard(SPACE);
  const series = useSensorSeries(SPACE, 5000);
  const risk = useRiskSeries(SPACE, 5000);
  const boost = useBoostState(3000);
  const regions = useExternalSignal(60000);
  const coway = useCowayStatus(5000);
  const plan = useControlPlan(SPACE, live?.tier ?? null);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  // 1.5s 틱 — 데이터 신선도(연결 표시)·시계 갱신용 (SSE 이벤트 사이에도 상태가 늙지 않게)
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1500); return () => clearInterval(t); }, []);
  // SSE 이벤트 상태가 아니라 "최근 데이터 수신"으로 연결 판정(헤드리스/프록시 환경에서도 견고)
  const fresh = connected || (!!lastTs && Date.now() - lastTs < 12000);

  const boostOn = !!boost?.boost_tier && boost.boost_tier !== "MONITOR";
  useControlNarration(live?.control_event, live?.control_event_id, voice);

  // 지도 내부 버튼/광주 지도 클릭도 상단 버튼과 같은 mav 원본 WAV를 재생한다.
  useEffect(() => {
    if (!voice) return;
    const onNarrate = (event: Event) => {
      const kind = (event as CustomEvent<NarrationKind>).detail;
      if (kind === "alert" || kind === "restore") playNarration(kind);
    };
    window.addEventListener("sentinel:narrate", onNarrate);
    return () => window.removeEventListener("sentinel:narrate", onNarrate);
  }, [voice]);

  const onToggle = async () => {
    setBusy(true);
    // 사용자 클릭 안에서 재생을 시작해 브라우저 자동재생 차단을 피한다.
    if (voice && !boostOn) playNarration("alert");
    if (boostOn) await clearRegion();
    else await selectRegion(DEMO_REGION, "replay");
    setTimeout(() => setBusy(false), 900);
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: "#fff", fontFamily: "'Pretendard',system-ui,sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes rise { from{height:0} }
        * { box-sizing: border-box; }
      `}</style>
      <TopBar screen={screen} connected={fresh} boostOn={boostOn} busy={busy} onToggle={onToggle} />
      {screen === "control" ? <div style={{ height: "calc(100vh - 62px)" }}><ControlRoom /></div>
        : screen === "appliance" ? <ApplianceScreen plan={plan} coway={coway} tier={live?.tier} />
        : screen === "epidemic" ? <div style={{ height: "calc(100vh - 62px)" }}><EpidemicMap /></div>
          : <SensorScreen live={live} series={series} risk={risk} boostActive={boostOn} />}
      {voice && <div style={{ position: "fixed", bottom: 14, right: 18, zIndex: 40, fontSize: 12, color: FAINT }}>🔊 녹음 내레이션 ON</div>}
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div style={{ background: INK, color: "#fff", minHeight: "100vh", display: "grid", placeItems: "center" }}>로딩…</div>}>
      <DemoInner />
    </Suspense>
  );
}
