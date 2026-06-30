import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Vignette, Caption, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {MockShot} from '../components/mock';
import {C} from '../theme';

// SCALE — one nurse, a whole ward. Live nurse dashboard, pan over rooms, one pulses.
export const Cut2: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base={C.bg0} blobs={[{color: '#13374a', x: 30, y: 40, r: 640, sp: 0.7}, {color: '#7a1530', x: 78, y: 30, r: 520, sp: 1.1}]} />
      <MockShot
        src="live/persona_nurse.png"
        dur={dur}
        label="간호사 관제 — 실시간 병동 감시"
        glow={C.amber}
        zoom={[{at: 0, scale: 1.05, x: 120, y: -30}, {at: dur, scale: 1.18, x: -80, y: 30}]}
        pulses={[{at: 70, dur: dur, x: 980, y: 360, w: 250, h: 150, color: C.red}]}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,11,22,0.35) 0%, rgba(6,11,22,0.0) 35%, rgba(6,11,22,0.72) 100%)'}} />
      <Vignette strength={0.5} />
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 120, paddingLeft: 110}}>
        <RevealText delay={10} size={84} align="left" width={840}>한 번 번지면,<br />병동 전체가 멈춥니다</RevealText>
      </AbsoluteFill>
      <Caption delay={24}>새벽, 간호사 한 명이 수십 명을 돌봅니다. 집단감염의 상당수는 눈에 안 보이는 공기로 번집니다.</Caption>
    </AbsoluteFill>
  );
};
