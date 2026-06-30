import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Vignette, Caption, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {MockShot} from '../components/mock';
import {C} from '../theme';

// STAGE 1 — external alert: cursor clicks "발령" → normal map flips to RED alert (가전 대기)
export const Cut4: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  const f = useCurrentFrame();
  const CLICK = 78;
  const alertO = interpolate(f, [CLICK + 4, CLICK + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cursor = [
    {at: 0, x: 700, y: 620},
    {at: CLICK - 6, x: 1300, y: 36},
    {at: CLICK, x: 1300, y: 36, click: true},
    {at: dur, x: 1300, y: 36},
  ];
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base="#05080f" blobs={[{color: '#7a1530', x: 35, y: 45, r: 640, sp: 0.7}, {color: C.amber, x: 75, y: 30, r: 460, sp: 1}]} />
      {/* normal */}
      <MockShot src="live/epidemic_normal.png" dur={dur} label="외부 역학 — UIS 조기경보" glow={C.teal}
        zoom={[{at: 0, scale: 1.05, x: 0, y: 0}, {at: dur, scale: 1.12, x: -40, y: 0}]} cursor={cursor} />
      {/* alert overlay */}
      <AbsoluteFill style={{opacity: alertO}}>
        <MockShot src="live/epidemic_alert.png" dur={dur} label="외부 역학 — 광주 경보 발령" glow={C.red}
          zoom={[{at: 0, scale: 1.05, x: 0, y: 0}, {at: dur, scale: 1.12, x: -40, y: 0}]}
          pulses={[{at: CLICK + 6, dur: dur, x: 820, y: 400, w: 230, h: 130, color: C.red}]} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,11,22,0.0) 45%, rgba(6,11,22,0.7) 100%)'}} />
      <Vignette strength={0.45} />
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60}}>
        <RevealText delay={10} size={70} width={1500}>
          위험이 닿기 전에, <span style={{color: C.amber}}>먼저</span>
        </RevealText>
      </AbsoluteFill>
      <Caption delay={CLICK + 10}>외부 위험이 오르면 판정 기준을 선제 상향 — 단, 가전은 아직 대기. 실내 위험을 확인하면 그때 움직입니다.</Caption>
    </AbsoluteFill>
  );
};
