import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Caption, Vignette, useCutFade} from '../components/ui';
import {AuroraBg, RevealText} from '../components/fx';
import {MockShot} from '../components/mock';
import {C, F} from '../theme';

const PERSONAS = [
  {src: 'live/persona_nurse.png', role: '간호사', desc: '실시간 병동 감염 감시', glow: C.amber},
  {src: 'live/persona_fm.png', role: '시설관리자', desc: 'ThinQ 가전 자동 방역', glow: C.teal},
  {src: 'live/persona_director.png', role: '병원장', desc: 'ESG·ROI 경영 리포트', glow: C.cyan},
  {src: 'live/persona_guardian.png', role: '보호자', desc: '가족 안심 케어 앱', glow: C.green},
];

const Badge: React.FC<{role: string; desc: string; color: string}> = ({role, desc, color}) => (
  <div style={{position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', textAlign: 'center'}}>
    <span style={{fontFamily: F.round, fontWeight: 800, fontSize: 46, color, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>{role}</span>
    <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 28, color: C.text, marginLeft: 18, textShadow: '0 4px 20px rgba(0,0,0,0.8)'}}>{desc}</span>
  </div>
);

// PERSONA MONTAGE — one platform, every role. quick zoom across live views.
export const Cut6: React.FC<{dur: number}> = ({dur}) => {
  const op = useCutFade(dur);
  const f = useCurrentFrame();
  const seg = dur / 4;
  const idx = Math.min(3, Math.floor(f / seg));
  const p = PERSONAS[idx];
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AuroraBg base="#06101e" blobs={[{color: C.teal, x: 30, y: 35, r: 600, sp: 0.8}, {color: C.cyan, x: 75, y: 70, r: 540, sp: 1.1}]} />
      {PERSONAS.map((pp, i) => {
        const start = i * seg;
        const o = interpolate(f, [start - 6, start + 8, start + seg - 8, start + seg + 6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        if (o <= 0) return null;
        return (
          <AbsoluteFill key={i} style={{opacity: o}}>
            <MockShot src={pp.src} dur={dur} label={`${pp.role} 뷰`} glow={pp.glow}
              zoom={[{at: start, scale: 1.12, x: i % 2 ? 60 : -60, y: 0}, {at: start + seg, scale: 1.02, x: 0, y: 0}]} />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,16,30,0.55) 0%, rgba(6,16,30,0.0) 28%, rgba(6,16,30,0.6) 100%)'}} />
      <Vignette strength={0.45} />
      <Badge role={p.role} desc={p.desc} color={p.glow} />
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 200}}>
        <RevealText delay={8} size={56} width={1400}>역할마다, <span style={{color: C.teal}}>하나의 플랫폼</span></RevealText>
      </AbsoluteFill>
      <Caption delay={14}>간호사·시설관리자·병원장·보호자 — 같은 데이터를 역할에 맞는 화면으로.</Caption>
    </AbsoluteFill>
  );
};
