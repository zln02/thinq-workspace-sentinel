import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Vignette, Caption, HonestyChip, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {MockShot} from '../components/mock';
import {DashFrame} from '../components/DashFrame';
import {C, F} from '../theme';

const TierBadge: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const esc = f > at;
  const color = esc ? C.orange : C.teal;
  const label = esc ? 'ALERT · 사전예방 모드' : 'MONITOR · 평상';
  const pulse = esc ? 0.5 + 0.5 * Math.sin(f / 6) : 1;
  const o = interpolate(f, [16, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 60, left: 80, fontFamily: F.sans, fontWeight: 700, fontSize: 28, color: '#0a0f1c', background: color, borderRadius: 12, padding: '12px 24px', opacity: o, boxShadow: `0 0 ${18 + pulse * 30}px ${color}`}}>
      ● {label}
    </div>
  );
};

// ★ STAGE 2 — real risk confirmed → space acts on its own (appliances run)
export const Cut5: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  const f = useCurrentFrame();
  const ESC = 120;
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base="#06101e" blobs={[{color: C.teal, x: 35, y: 40, r: 640, sp: 0.8}, {color: C.orange, x: 72, y: 65, r: 520, sp: 1.1}]} />
      {/* 3D ward control screen */}
      <MockShot src="live/control_normal.png" dur={dur} label="관제 — 201호 다인실 (3D 병동)" glow={f > ESC ? C.orange : C.teal}
        zoom={[{at: 0, scale: 1.06, x: 0, y: 0}, {at: ESC, scale: 1.14, x: 0, y: -10}, {at: dur, scale: 1.22, x: 20, y: -20}]}
        pulses={f > ESC ? [{at: ESC, dur: dur, x: 820, y: 430, w: 520, h: 300, color: C.teal}] : []} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,16,30,0.35) 0%, rgba(6,16,30,0.0) 30%, rgba(6,16,30,0.82) 100%)'}} />
      <Vignette strength={0.5} />

      <TierBadge at={ESC} />

      {/* PiP: live coway appliance console (FM) sliding in, cursor click 급속 */}
      <div style={{position: 'absolute', inset: 0, opacity: interpolate(f, [60, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <DashFrame src="live/persona_fm.png" delay={60} x={1420} y={640} w={860} rotate={-2} glow={f > ESC ? C.orange : C.teal} label="시설·가전 — 코웨이 공기청정기 실연동" />
      </div>

      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 150, paddingLeft: 80}}>
        <RevealText delay={20} size={76} align="left" width={760}>증상 전에,<br /><span style={{color: C.teal}}>공간이 먼저</span> 깨어납니다</RevealText>
      </AbsoluteFill>
      <Caption delay={ESC - 10}>실내 위험이 확인되면 — 사람 개입 없이 공기청정·환기를 자동 가동. 근거 없는 가전은 끕니다.</Caption>
      <HonestyChip delay={30}>실연동 = 코웨이 공기청정기 1종 · 시연구간 201호 · 그 외 제어계획(시뮬)</HonestyChip>
    </AbsoluteFill>
  );
};
