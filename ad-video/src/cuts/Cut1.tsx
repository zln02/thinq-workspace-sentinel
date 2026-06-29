import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Particles, Vignette, Caption, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {MockShot} from '../components/mock';
import {C} from '../theme';

// HOOK — invisible threat. Live sensor dashboard, darkened, particles drift.
export const Cut1: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base={C.bg0} blobs={[{color: '#16324f', x: 40, y: 35, r: 700, sp: 0.6}, {color: '#1e3a8a', x: 70, y: 70, r: 600, sp: 0.9}]} />
      <AbsoluteFill style={{filter: 'brightness(0.4) saturate(0.85)'}}>
        <MockShot src="live/sensor.png" dur={dur} label="실시간 센서 — 201호" glow="#2b3b57"
          zoom={[{at: 0, scale: 1.16, x: 0, y: 40}, {at: dur, scale: 1.28, x: 0, y: 10}]} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,11,22,0.55), rgba(6,11,22,0.78))'}} />
      <Particles count={48} color="#BBD6FF" opacity={0.5} />
      <Vignette strength={0.62} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <RevealText delay={14} size={108}>보이지 않는 위협</RevealText>
      </AbsoluteFill>
      <Caption delay={40}>요양병원이 가장 두려워하는 것 — 눈에 보이지 않는, 공기 속 감염.</Caption>
    </AbsoluteFill>
  );
};
