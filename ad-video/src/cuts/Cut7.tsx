import React from 'react';
import {AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {Vignette, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {C, F} from '../theme';

// BRAND CLOSE — clean lockup over softly-lit 3D ward (no people)
export const Cut7: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 18, fps, config: {damping: 200}});
  const z = interpolate(f, [0, dur], [1.1, 1.18]);
  return (
    <AbsoluteFill style={{opacity: op, background: C.bg0}}>
      <AuroraBg base={C.bg0} blobs={[{color: C.teal, x: 30, y: 40, r: 700, sp: 0.6}, {color: '#1e3a8a', x: 72, y: 65, r: 620, sp: 0.9}]} />
      <AbsoluteFill style={{opacity: 0.4}}>
        <Img src={staticFile('live/control_normal.png')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: 'blur(8px) brightness(0.7) saturate(1.1)'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(70% 70% at 50% 50%, rgba(6,11,22,0.55), rgba(6,11,22,0.9))'}} />
      <Vignette strength={0.5} />

      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        {/* logo mark */}
        <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`}}>
          <span style={{width: 26, height: 26, borderRadius: '50%', background: C.teal, boxShadow: `0 0 26px ${C.teal}`}} />
          <span style={{fontFamily: F.round, fontWeight: 800, fontSize: 78, color: C.text, letterSpacing: '-0.01em'}}>ThinQ Space Sentinel</span>
        </div>
        <div style={{marginTop: 14}}>
          <RevealText delay={26} size={48} color={C.warm} width={1400}>증상이 나타나기 전에, 공간이 먼저 깨어납니다</RevealText>
        </div>
        <div style={{marginTop: 40, fontFamily: F.sans, fontWeight: 700, fontSize: 26, color: C.muted, opacity: interpolate(f, [50, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          요양병원 감염관리 시스템 · 75,633건의 현장 목소리에서 출발
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
