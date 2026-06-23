"use client";
/* 모니터2 — 시네마틱 관제 화면
 * 간호사(ICN) | 시설관리자(FM) 2분할 + 2.5D 병동 일러스트(가전 풍량/환기/UV 애니메이션)
 * + 알림 토스트(tier 전이). 음성은 3면 중 `voice=1`인 조작 화면에서만 재생한다.
 * 실센서 CO2(입김)로 tier가 오르면 가전이 가동되고, 내려가면 일반모드로 복귀하는 게 자동으로 보인다.
 */
import { useEffect, useRef, useState } from "react";
import { useLiveWard, useControlPlan, useBoostState, type ControlPlanDevice } from "@/lib/useSentinel";
import { tierMeta, tierRank } from "@/lib/tier";

const INK = "#0f1722", PANEL = "#16212e", CARD = "#1d2a3a", LINE = "#2c3a4d";
const MUTE = "#8aa0b6", FAINT = "#5d7088", ACCENT = "#36d399", BLUE = "#5b9dff", GOLD = "#ffcf6b", CORAL = "#e2543b";
const SPACE = "ward_a";

type Toast = { id: number; title: string; body: string; kind: "alert" | "control" | "calm" };

// ── 2.5D 병동 일러스트 ──────────────────────────────────────
// 가전 위치(이미지 % 좌표) — 발령 시 가동 이펙트를 여기에 얹는다.
const WARD_FX = [
  { x: 12, y: 51, color: "#36d399", kind: "ring", label: "공기청정 TURBO" },
  { x: 46, y: 18, color: "#36d399", kind: "ring", label: "환기 MAX" },
  { x: 67, y: 14, color: "#b794ff", kind: "glow", label: "UV-C 살균" },
  { x: 86, y: 30, color: "#5b9dff", kind: "ring", label: "에어컨 송풍" },
  { x: 80, y: 51, color: "#7fc4ff", kind: "mist", label: "가습 50%" },
] as const;

function Ward({ active, tier }: { active: boolean; tier: string }) {
  const on = active;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const vig = tierRank(tier) >= 4 ? CORAL : ACCENT;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 360, borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", background: "#0d1622" }}>
      <style>{`
        @keyframes wfxRing{0%{transform:scale(0.2);opacity:.9}100%{transform:scale(3.2);opacity:0}}
        @keyframes wfxPulse{0%,100%{opacity:.35;transform:scale(0.8)}50%{opacity:.95;transform:scale(1.3)}}
        @keyframes wfxMist{0%{transform:translateY(6px);opacity:.9}100%{transform:translateY(-34px);opacity:0}}
        @keyframes wfxDot{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.45)}}
        @keyframes wfxScan{0%{top:-14%;opacity:0}10%{opacity:.95}50%{opacity:.95}90%{opacity:0}100%{top:114%;opacity:0}}
        @keyframes wfxVig{0%,100%{opacity:.4}50%{opacity:.95}}
        @keyframes wfxChip{0%{opacity:0;transform:translate(-50%,6px)}100%{opacity:1;transform:translate(-50%,0)}}
      `}</style>
      <img src={`${base}/ward.png`} alt="201호 병동"
        style={{ width: "100%", height: "100%", objectFit: "cover",
                 transform: on ? "scale(1.045)" : "scale(1)",
                 filter: on ? "saturate(1.2) brightness(1.07) contrast(1.05)" : "saturate(0.42) brightness(0.62)",
                 transition: "filter 1s ease, transform 1.2s ease" }} />
      {on && <>
        {/* 비네트 펄스(등급색) */}
        <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 130px 12px ${vig}66`, animation: "wfxVig 2s ease-in-out infinite", pointerEvents: "none" }} />
        {/* 스캔 스윕 */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "16%", background: `linear-gradient(${vig}00, ${vig}66, ${vig}00)`, animation: "wfxScan 3.2s ease-in-out infinite", pointerEvents: "none" }} />
        {/* 가전별 이펙트 + 액션 라벨 */}
        {WARD_FX.map((fx, i) => (
          <div key={i} style={{ position: "absolute", left: `${fx.x}%`, top: `${fx.y}%`, transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
            <span style={{ position: "absolute", width: 110, height: 110, left: -55, top: -55, borderRadius: "50%", background: `radial-gradient(circle, ${fx.color}, transparent 68%)`, opacity: 0.5, animation: "wfxPulse 1.8s ease-in-out infinite" }} />
            {fx.kind === "ring" && [0, 1, 2, 3].map((k) => (
              <span key={k} style={{ position: "absolute", width: 46, height: 46, left: -23, top: -23, borderRadius: "50%", border: `2.5px solid ${fx.color}`, animation: `wfxRing 2.4s ${k * 0.55}s ease-out infinite` }} />
            ))}
            {fx.kind === "mist" && [0, 1, 2, 3].map((k) => (
              <span key={k} style={{ position: "absolute", left: (k - 1.5) * 7, top: 0, width: 7, height: 7, borderRadius: "50%", background: fx.color, animation: `wfxMist 1.9s ${k * 0.4}s ease-out infinite` }} />
            ))}
            <span style={{ position: "absolute", width: 11, height: 11, left: -5.5, top: -5.5, borderRadius: "50%", background: "#fff", boxShadow: `0 0 16px 3px ${fx.color}`, animation: "wfxDot 1.4s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: 18, left: "50%", whiteSpace: "nowrap", fontSize: 11, fontWeight: 800, color: "#fff", background: `${fx.color}e0`, borderRadius: 8, padding: "2px 9px", animation: "wfxChip .5s ease both", boxShadow: `0 2px 12px ${fx.color}90` }}>{fx.label}</div>
          </div>
        ))}
      </>}
      {/* 동적 상태 배지 */}
      <div style={{ position: "absolute", top: 12, right: 12, background: on ? `${vig}33` : "rgba(8,14,22,0.6)", border: `1.5px solid ${on ? vig : LINE}`, borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 800, color: on ? "#fff" : MUTE, backdropFilter: "blur(4px)", animation: on ? "wfxDot 1.6s ease-in-out infinite" : "none" }}>
        {on ? "🟢 가전 사전예방 가동 중" : "○ 평상시 대기"}
      </div>
    </div>
  );
}

export default function ControlRoom() {
  const { data: live, lastTs } = useLiveWard(SPACE);
  const boost = useBoostState(3000);
  const plan = useControlPlan(SPACE, live?.control_active ? (live?.sensor_tier ?? live?.tier) : "MONITOR");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, force] = useState(0);
  const prevTier = useRef<string | null>(null);
  const tid = useRef(0);

  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1500); return () => clearInterval(t); }, []);

  const region = boost?.region;
  const ext = !!boost?.boost_tier && boost.boost_tier !== "MONITOR";   // 외부 발령(모니터1)에만 경보
  const tier = ext ? (live?.tier ?? boost?.boost_tier ?? "MONITOR") : "MONITOR"; // 발령 전엔 평상시(센서 노이즈로 혼자 심각 안 됨)
  const tm = tierMeta(tier);
  const active = !!live?.control_active;    // 실제 가전 가동 = CO₂ 급상승 상태기계가 ON일 때만
  const sensorTier = live?.sensor_tier ?? (live?.tier_source === "sensor" ? live?.tier : "MONITOR");
  const fresh = !!lastTs && Date.now() - lastTs < 12000;
  const risen = useRef(false);
  // 가전 가동 강도 추이(경보 시 상승)
  const intensity = plan?.intensity ?? 0.3;
  const [intHist, setIntHist] = useState<number[]>([]);
  useEffect(() => { const t = setInterval(() => setIntHist((h) => [...h.slice(-30), intensity]), 1500); return () => clearInterval(t); }, [intensity]);

  // 외부 경보 발령/해제(모니터1) → 사전예방 전환 / 일반복귀 토스트+음성. (센서 노이즈로 혼자 울리지 않음)
  const prevBoost = useRef<string | null>(null);
  useEffect(() => {
    const b = boost?.boost_tier ?? "MONITOR";
    const before = prevBoost.current; prevBoost.current = b;
    if (before === null || before === b) return;   // 첫 로드/무변화는 발화 안 함
    const push = (t: Toast) => { setToasts((x) => [...x.slice(-2), t]); setTimeout(() => setToasts((x) => x.filter((q) => q.id !== t.id)), 9000); };
    if (b !== "MONITOR" && before === "MONITOR") {
      risen.current = false;
      push({ id: ++tid.current, kind: "alert", title: `${region ?? "광주광역시"} 인플루엔자 경보 발령`, body: "판정 기준을 경계로 상향했습니다. 가전은 실내 센서 이상 전까지 대기합니다." });
    } else if (b === "MONITOR" && before !== "MONITOR") {
      risen.current = false;
    }
  }, [boost?.boost_tier, region]);

  // 백엔드 실측 상태기계 이벤트를 관제 토스트에 반영한다.
  const prevControlEventId = useRef<number | null>(null);
  useEffect(() => {
    const event = live?.control_event ?? null;
    const eventId = live?.control_event_id ?? null;
    if (!event || eventId == null || eventId === prevControlEventId.current) return;
    prevControlEventId.current = eventId;
    if (event === "activated") {
      risen.current = true;
      const t: Toast = { id: ++tid.current, kind: "control", title: "실내 전파 위험확률 급상승", body: "실측 CO₂ 급상승을 확인해 공기청정·환기 제어를 시작합니다." };
      setToasts((x) => [...x.slice(-2), t]); setTimeout(() => setToasts((x) => x.filter((q) => q.id !== t.id)), 9000);
    } else if (event === "recovered") {
      risen.current = false;
      const t: Toast = { id: ++tid.current, kind: "calm", title: "실내 위험도 정상화", body: "CO₂가 5초 이상 정상 범위로 유지되어 가전을 일반 모드로 전환합니다." };
      setToasts((x) => [...x.slice(-2), t]); setTimeout(() => setToasts((x) => x.filter((q) => q.id !== t.id)), 9000);
    }
  }, [live?.control_event, live?.control_event_id]);

  const applied: ControlPlanDevice[] = plan?.applied ?? [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: INK, color: "#fff",
                  fontFamily: "'Pretendard',system-ui,sans-serif" }}>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      {/* 헤더: 역할 2분할 */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", borderBottom: `1px solid ${LINE}`, background: PANEL, gap: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 19 }}>상황 관제 — 201호 다인실</div>
        <span style={{ background: tm.border, color: "#fff", borderRadius: 8, padding: "4px 14px", fontWeight: 800 }}>{tm.emoji} {tm.label}</span>
        {ext && <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>외부 조기경보 발(發) · {region ?? "광주"}</span>}
        <span style={{ marginLeft: "auto", fontSize: 13, color: fresh ? ACCENT : CORAL }}>
          ● {fresh ? "실센서 실시간" : "재연결"}
        </span>
      </div>

      {/* 토스트 */}
      <div style={{ position: "absolute", top: 64, right: 18, zIndex: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ width: 320, background: t.kind === "calm" ? "#16352a" : t.kind === "alert" ? "#3a1f1a" : "#2a2410",
                                   border: `1px solid ${t.kind === "calm" ? ACCENT : t.kind === "alert" ? CORAL : GOLD}`,
                                   borderRadius: 12, padding: "12px 14px", animation: "slideIn 0.4s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.kind === "calm" ? ACCENT : t.kind === "alert" ? "#ff9b85" : GOLD }}>
              {t.kind === "calm" ? "🟢" : t.kind === "alert" ? "🚨" : "⚙️"} {t.title}
            </div>
            <div style={{ fontSize: 13, color: "#dfe7f0", marginTop: 3 }}>{t.body}</div>
          </div>
        ))}
      </div>

      {/* 본문: 간호사 | 병동(시설관리자) */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 300px", gap: 14, padding: 16, minHeight: 0 }}>
        {/* 간호사(ICN) */}
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: BLUE, fontWeight: 800 }}>👩‍⚕️ 간호사 (감염관리)</div>
          <div style={{ background: PANEL, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, color: MUTE }}>감염 위험 등급</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: tm.border }}>{tm.emoji} {tm.label}</div>
          </div>
          <Stat label="재실 인원 (카메라 실측)" value={live?.occupancy != null ? `${live.occupancy} 명` : "—"} color={ACCENT} />
          <Stat label="감염확률 PoI" value={live?.poi != null ? `${(live.poi * 100).toFixed(1)}%` : "—"} />
          <div style={{ marginTop: "auto", fontSize: 12, color: FAINT, lineHeight: 1.5 }}>
            {active ? "실측 CO₂ 급상승으로 자동 제어 중." : ext ? "외부 경보 경계 모드. 실내 센서 이상 감시 중이며 가전은 대기." : "평상시 자동 모니터링."}
          </div>
        </div>

        {/* 병동 일러스트 */}
        <div style={{ background: CARD, border: `1px solid ${active ? ACCENT : LINE}`, borderRadius: 14, padding: 8, position: "relative" }}>
          <Ward active={active} tier={tier} />
        </div>

        {/* 시설관리자(FM) — 가전 */}
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ fontSize: 13, color: GOLD, fontWeight: 800 }}>🛠️ 시설관리자 (가전 제어)</div>
          <div style={{ fontSize: 12, color: MUTE }}>{plan?.pathogen ?? "—"} 프로토콜</div>
          {/* 가전 가동 강도 추이 */}
          <div style={{ background: PANEL, borderRadius: 9, padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTE }}>
              <span>가전 가동 강도</span><span style={{ color: active ? ACCENT : FAINT, fontWeight: 800 }}>×{intensity.toFixed(2)}</span>
            </div>
            <svg viewBox="0 0 200 38" preserveAspectRatio="none" style={{ width: "100%", height: 34, marginTop: 4 }}>
              <line x1="0" y1="19" x2="200" y2="19" stroke={LINE} strokeWidth="1" />
              <polyline points={(intHist.length ? intHist : [intensity]).map((v, i, a) => `${(i / Math.max(1, a.length - 1)) * 200},${(38 - ((v - 0.3) / (1.5 - 0.3)) * 36).toFixed(1)}`).join(" ")} fill="none" stroke={active ? ACCENT : BLUE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          {applied.slice(0, 5).map((d) => {
            const real = d.device === "AIR_PURIFIER";
            return (
              <div key={d.device} style={{ background: PANEL, borderRadius: 9, padding: "8px 10px", borderLeft: `3px solid ${active ? (real ? ACCENT : BLUE) : LINE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{d.name_kr}</span>
                  <span style={{ fontSize: 11, color: real ? ACCENT : MUTE }}>{real ? "● 실연동" : "시뮬"}</span>
                </div>
                <div style={{ fontSize: 13, color: active ? (real ? ACCENT : "#dfe7f0") : FAINT, fontWeight: 700 }}>{d.setting}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: PANEL, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, color: MUTE }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? "#fff" }}>{value}</div>
    </div>
  );
}
