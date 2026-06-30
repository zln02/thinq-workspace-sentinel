import React from 'react';
import {Img, staticFile, interpolate, useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {C, F} from '../theme';

// real product dashboard shown inside a sleek browser frame, with REAL ASSET badge
export const DashFrame: React.FC<{
  src: string;
  delay?: number;
  x?: number;
  y?: number;
  w?: number;
  rotate?: number;
  glow?: string;
  label?: string;
}> = ({src, delay = 6, x = 0, y = 0, w = 1180, rotate = 0, glow = C.teal, label = 'LIVE 대시보드'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 0.8}});
  const pop = interpolate(s, [0, 1], [0.92, 1]);
  const glowPulse = 0.5 + 0.5 * Math.sin(f / 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${pop})`,
        opacity: s,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 30px 90px rgba(0,0,0,0.6), 0 0 ${30 + glowPulse * 40}px ${glow}66`,
        border: `1.5px solid ${glow}88`,
        background: C.bg2,
      }}
    >
      {/* title bar */}
      <div
        style={{
          height: 34,
          background: 'linear-gradient(180deg,#1a2640,#121b30)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 7,
        }}
      >
        <span style={{width: 11, height: 11, borderRadius: '50%', background: '#ff5f57'}} />
        <span style={{width: 11, height: 11, borderRadius: '50%', background: '#febc2e'}} />
        <span style={{width: 11, height: 11, borderRadius: '50%', background: '#28c840'}} />
        <span
          style={{
            marginLeft: 14,
            fontFamily: F.sans,
            fontSize: 16,
            fontWeight: 700,
            color: glow,
            letterSpacing: '0.04em',
          }}
        >
          ● {label}
        </span>
      </div>
      <Img src={staticFile(src)} style={{width: '100%', display: 'block'}} />
    </div>
  );
};
