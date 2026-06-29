"use client";
/* 시연용 중앙 대형 알림 — 대시보드(청중)별로 문구를 달리한다.
 *   variant: epidemic(역학 관제) · control(관제·가전) · sensor(센서·알고리즘) · nurse(간호 감염관리) · guardian(보호자 안심)
 * 각 variant가 보여줄 이벤트(dispatch 발령 / activated 가동 / recovered 회복)와 문구를 직접 정의한다.
 * 자체적으로 라이브·boost 를 구독하므로 어느 화면에 얹어도 동작. 한 화면에 하나만 마운트할 것.
 */
import { useEffect, useRef, useState } from "react";
import { useLiveWard, useBoostState } from "@/lib/useSentinel";

type Kind = "alert" | "control" | "calm";
type Variant = "epidemic" | "control" | "sensor" | "nurse" | "guardian";
type Msg = { kind: Kind; title: string; body: string };
type Banner = Msg & { id: number };

const STYLE: Record<Kind, { bg: string; border: string; fg: string; icon: string; glow: string }> = {
  alert:   { bg: "rgba(58,31,26,0.97)",  border: "#e2543b", fg: "#ff9b85", icon: "🚨", glow: "rgba(226,84,59,0.55)" },
  control: { bg: "rgba(42,36,16,0.97)",  border: "#ffcf6b", fg: "#ffcf6b", icon: "⚙️", glow: "rgba(255,207,107,0.5)" },
  calm:    { bg: "rgba(22,53,42,0.97)",  border: "#36d399", fg: "#7fe0a8", icon: "🟢", glow: "rgba(54,211,153,0.5)" },
};

const HOLD_MS = 6500;

export default function CenterAlert({ space = "ward_a", compact = false, variant = "control" }: { space?: string; compact?: boolean; variant?: Variant }) {
  const { data: live } = useLiveWard(space);
  const boost = useBoostState(3000);
  const [banner, setBanner] = useState<Banner | null>(null);
  const id = useRef(0);
  const prevBoost = useRef<string | null>(null);
  const prevEventId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const region = boost?.region ?? "광주광역시";
  // 대시보드 컨셉별 알림 문구. 정의된 이벤트만 그 화면에 뜬다.
  const MSG: Record<Variant, Partial<Record<"dispatch" | "activated" | "recovered", Msg>>> = {
    // 외부역학 관제 — 지역 감염병 조기경보만 (가전 내용 없음)
    epidemic: {
      dispatch: { kind: "alert", title: `${region} 인플루엔자 경보 발령`, body: "질병청·UIS 조기경보 — 지역 감염병 위험이 상승했습니다. 병원이 선제 대응을 시작합니다." },
    },
    // 관제·가전 제어 — 가전 자동 가동/복귀
    control: {
      activated: { kind: "control", title: "실내 CO₂ 급상승 — 가전 자동 가동", body: "공기청정기·환기를 터보로 자동 가동합니다." },
      recovered: { kind: "calm", title: "실내 정상화 — 가전 일반 모드", body: "CO₂가 안정 범위로 회복돼 가전을 일반 모드로 전환합니다." },
    },
    // 센서·알고리즘 — 전파위험확률(PoI) 관점
    sensor: {
      activated: { kind: "control", title: "감염 전파위험 급상승", body: "실측 CO₂ 급상승 → 재호흡분율↑ · 전파위험확률(PoI)이 임계를 넘었습니다." },
      recovered: { kind: "calm", title: "전파위험 정상화", body: "CO₂·PoI가 안정 범위로 회복됐습니다." },
    },
    // 간호사 감염관리 — 병동/환자 관점 (지역경보 + 대응)
    nurse: {
      dispatch: { kind: "alert", title: `${region} 인플루엔자 지역경보`, body: "지역 조기경보 — 병동 감염관리 경계 강화. 201호 실시간 모니터링 중입니다." },
      activated: { kind: "control", title: "201호 감염위험 상승 — 선제 대응", body: "실내 CO₂ 급상승 — 환기·공기청정 자동 가동. 추가 관찰을 권고합니다." },
      recovered: { kind: "calm", title: "201호 위험도 정상화", body: "병실 환경이 안정 범위로 회복됐습니다." },
    },
    // 보호자 — 안심 톤 (비전문/친근)
    guardian: {
      dispatch: { kind: "alert", title: "지역 감염병 주의 안내", body: "지역에 감염병이 늘고 있어요. 병원이 어르신 병실 공기를 미리 관리합니다." },
      activated: { kind: "control", title: "병실 공기 관리 시작", body: "실내 공기질 변화로 환기·공기청정기를 자동으로 강화했어요. 안심하세요." },
      recovered: { kind: "calm", title: "병실 공기 정상", body: "공기질이 다시 쾌적해졌어요. 어르신은 안전합니다." },
    },
  };
  const msgFor = (ev: "dispatch" | "activated" | "recovered") => MSG[variant]?.[ev] ?? null;

  const show = (m: Msg) => {
    if (timer.current) clearTimeout(timer.current);
    const next = { ...m, id: ++id.current };
    setBanner(next);
    timer.current = setTimeout(() => setBanner((cur) => (cur && cur.id === next.id ? null : cur)), HOLD_MS);
  };

  // 외부 경보 발령 (모니터1 → select-region)
  useEffect(() => {
    const b = boost?.boost_tier ?? "MONITOR";
    const before = prevBoost.current;
    prevBoost.current = b;
    if (before === null || before === b) return;
    if (b !== "MONITOR" && before === "MONITOR") {
      const m = msgFor("dispatch");
      if (m) show(m);
    }
  }, [boost?.boost_tier, boost?.region]);

  // 백엔드 상태기계 이벤트 (activated / recovered)
  useEffect(() => {
    const ev = live?.control_event ?? null;
    const eid = live?.control_event_id ?? null;
    if (!ev || eid == null || eid === prevEventId.current) return;
    prevEventId.current = eid;
    if (ev === "activated" || ev === "recovered") {
      const m = msgFor(ev);
      if (m) show(m);
    }
  }, [live?.control_event, live?.control_event_id]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!banner) return null;
  const s = STYLE[banner.kind];

  // 모바일(보호자 앱) — iOS 푸시처럼 상단에서 내려오는 배너
  if (compact) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, display: "flex", justifyContent: "center",
                    pointerEvents: "none", paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
        <style>{`@keyframes iosDrop{0%{transform:translateY(-140%);opacity:0}65%{transform:translateY(5%)}100%{transform:translateY(0);opacity:1}}@keyframes iosBar{from{width:100%}to{width:0%}}`}</style>
        <div style={{ width: "92%", maxWidth: 400, background: "rgba(28,30,34,0.92)", border: `1px solid ${s.border}66`,
                      borderLeft: `4px solid ${s.border}`, borderRadius: 16, padding: "11px 14px", display: "flex", gap: 10,
                      alignItems: "flex-start", boxShadow: "0 12px 32px rgba(0,0,0,0.45)", backdropFilter: "blur(14px)",
                      animation: "iosDrop .5s cubic-bezier(.2,.9,.2,1)", fontFamily: "'Pretendard',system-ui,sans-serif",
                      position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 24, lineHeight: 1.1 }}>{s.icon}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.fg, letterSpacing: "0.02em" }}>ThinQ 케어 · 지금</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 1 }}>{banner.title}</div>
            <div style={{ fontSize: 13, color: "#dfe5ee", marginTop: 2, lineHeight: 1.4 }}>{banner.body}</div>
          </div>
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 3, background: s.border, animation: `iosBar ${HOLD_MS}ms linear forwards` }} />
        </div>
      </div>
    );
  }

  // 데스크탑(데모·관제·대시보드) — 화면 중앙 대형 알림
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", pointerEvents: "none" }}>
      <style>{`
        @keyframes caIn{0%{transform:scale(.82);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes caGlow{0%,100%{box-shadow:0 0 0 0 var(--cag)}50%{box-shadow:0 0 64px 8px var(--cag)}}
        @keyframes caBar{from{width:100%}to{width:0%}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,9,16,0.34)" }} />
      <div style={{ position: "relative", width: "min(86vw, 720px)", background: s.bg, border: `2.5px solid ${s.border}`,
                    borderRadius: 22, padding: "34px 44px", textAlign: "center", backdropFilter: "blur(8px)",
                    // @ts-expect-error css var
                    "--cag": s.glow, animation: "caIn .42s cubic-bezier(.2,.8,.2,1), caGlow 2s ease-in-out infinite",
                    fontFamily: "'Pretendard',system-ui,sans-serif", overflow: "hidden" }}>
        <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 12 }}>{s.icon}</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: s.fg, letterSpacing: "-0.5px" }}>{banner.title}</div>
        <div style={{ fontSize: 19, color: "#eef3f9", marginTop: 12, lineHeight: 1.55, fontWeight: 500 }}>{banner.body}</div>
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 5, background: s.border,
                      animation: `caBar ${HOLD_MS}ms linear forwards` }} />
      </div>
    </div>
  );
}
