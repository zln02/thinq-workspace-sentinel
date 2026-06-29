import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Vignette, Caption, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {UISModel} from '../components/UISModel';
import {C, F} from '../theme';

// ★ UIS MODEL — 3 leading signals train a model that tracks real clinical incidence
export const Cut3: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base="#05080f" blobs={[{color: C.teal, x: 22, y: 45, r: 640, sp: 0.8}, {color: C.cyan, x: 60, y: 30, r: 560, sp: 1.2}, {color: '#1e3a8a', x: 80, y: 75, r: 600, sp: 0.6}]} />
      <Vignette strength={0.5} />

      <div style={{position: 'absolute', top: 70, width: '100%', textAlign: 'center'}}>
        <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 28, color: C.teal, letterSpacing: '0.06em'}}>외부 조기경보 시스템 (UIS)</div>
        <AbsoluteFill style={{position: 'relative', alignItems: 'center'}}>
          <RevealText delay={10} size={64} width={1500}>
            3개 외부 신호로 학습한 모델이 <span style={{color: C.amber}}>실제 확진</span>을 선행 추적
          </RevealText>
        </AbsoluteFill>
      </div>

      <div style={{position: 'absolute', top: 250, left: '50%', transform: 'translateX(-50%)'}}>
        <UISModel delay={20} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 150,
          width: '100%',
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 24,
          color: C.faint,
          opacity: interpolate(f, [150, 175], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        호흡기 · 행동 · 환경 3개 신호 레이어를 UIS 모델이 융합 → 인플루엔자 확진 추이를 선행 추적. 예측은 외부 UIS, Sentinel은 라스트마일.
      </div>

      <Caption delay={30}>흩어진 외부 신호가 하나의 모델로 모여, 병원에 닿기 전에 위험을 먼저 읽습니다.</Caption>
    </AbsoluteFill>
  );
};
