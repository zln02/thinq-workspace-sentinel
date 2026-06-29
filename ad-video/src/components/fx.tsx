import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {C, F} from '../theme';

// Animated aurora / gradient-mesh background — drifting luminous blobs
export const AuroraBg: React.FC<{
  base?: string;
  blobs?: {color: string; x: number; y: number; r: number; sp: number}[];
}> = ({
  base = C.bg0,
  blobs = [
    {color: C.teal, x: 28, y: 30, r: 620, sp: 1},
    {color: C.cyan, x: 74, y: 64, r: 560, sp: 1.4},
    {color: '#1e3a8a', x: 52, y: 18, r: 700, sp: 0.7},
  ],
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      {blobs.map((b, i) => {
        const dx = Math.sin((f * 0.01 * b.sp) + i) * 60;
        const dy = Math.cos((f * 0.008 * b.sp) + i * 1.7) * 50;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.r,
              height: b.r,
              marginLeft: -b.r / 2,
              marginTop: -b.r / 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color}55 0%, ${b.color}00 65%)`,
              transform: `translate(${dx}px, ${dy}px)`,
              filter: 'blur(40px)',
              opacity: 0.7,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Film grain overlay (subtle moving noise) — gives a cinematic texture
const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
);
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
  const f = useCurrentFrame();
  // jitter the tile so the grain animates frame-to-frame
  const tx = (f * 7) % 200;
  const ty = (f * 13) % 200;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")`,
        backgroundRepeat: 'repeat',
        backgroundPosition: `${tx}px ${ty}px`,
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

// Headline that reveals via a clip-path wipe + blur settle + rise
export const RevealText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: 'center' | 'left';
  width?: number | string;
  lineHeight?: number;
}> = ({
  children,
  delay = 6,
  size = 92,
  color = C.text,
  weight = 800,
  align = 'center',
  width = '100%',
  lineHeight = 1.12,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 0.8}});
  const clip = interpolate(s, [0, 1], [100, 0]);
  const blur = interpolate(s, [0, 1], [12, 0]);
  const y = interpolate(s, [0, 1], [26, 0]);
  return (
    <div
      style={{
        fontFamily: F.round,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        letterSpacing: '-0.02em',
        textAlign: align,
        width,
        transform: `translateY(${y}px)`,
        filter: `blur(${blur}px)`,
        clipPath: `inset(0 ${clip}% 0 0)`,
        WebkitClipPath: `inset(0 ${clip}% 0 0)`,
        textShadow: '0 6px 40px rgba(0,0,0,0.55)',
      }}
    >
      {children}
    </div>
  );
};
