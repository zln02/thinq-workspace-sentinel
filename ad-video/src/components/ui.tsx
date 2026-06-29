import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';
import {C, F} from '../theme';

// fade in only — cross-cut dissolves are handled by TransitionSeries
export const useCutFade = (dur: number, inF = 14, _outF = 0) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, inF], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

export const Bg: React.FC<{from?: string; to?: string}> = ({
  from = C.bg0,
  to = C.bg1,
}) => (
  <AbsoluteFill
    style={{background: `radial-gradient(120% 120% at 50% 25%, ${to} 0%, ${from} 70%)`}}
  />
);

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.55}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(75% 75% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

// Ken Burns image layer
export const KenBurns: React.FC<{
  src: string;
  dur: number;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  filter?: string;
  fit?: 'cover' | 'contain';
  opacity?: number;
}> = ({
  src,
  dur,
  zoomFrom = 1.06,
  zoomTo = 1.16,
  panX = 0,
  panY = 0,
  filter = 'none',
  fit = 'cover',
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], [zoomFrom, zoomTo], {
    extrapolateRight: 'clamp',
  });
  const tx = interpolate(f, [0, dur], [0, panX], {extrapolateRight: 'clamp'});
  const ty = interpolate(f, [0, dur], [0, panY], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          transform: `scale(${z}) translate(${tx}px, ${ty}px)`,
          filter,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};

// drifting particles (invisible airborne threat)
export const Particles: React.FC<{count?: number; color?: string; opacity?: number}> = ({
  count = 46,
  color = '#CFE6FF',
  opacity = 0.5,
}) => {
  const f = useCurrentFrame();
  const items = Array.from({length: count}, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const r2 = ((i * 4129 + 7) % 100) / 100;
    const r3 = ((i * 7919 + 13) % 100) / 100;
    const x = r * 1920;
    const baseY = r2 * 1080;
    const drift = ((f * (0.15 + r3 * 0.5)) % 1120) - 20;
    const y = (baseY + drift) % 1120;
    const size = 2 + r3 * 5;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin((f + i * 23) / 30));
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          opacity: opacity * tw,
          filter: 'blur(0.6px)',
          boxShadow: `0 0 ${size * 2}px ${color}`,
        }}
      />
    );
  });
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{items}</AbsoluteFill>;
};

// large kinetic headline word
export const BigWord: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  accent?: string;
  top?: number | string;
  align?: 'center' | 'flex-start';
  left?: number;
  weight?: number;
  shadow?: boolean;
}> = ({
  children,
  delay = 6,
  size = 96,
  color = C.text,
  top = '38%',
  align = 'center',
  left,
  weight = 800,
  shadow = true,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 0.7}});
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: align,
        paddingLeft: left ?? (align === 'center' ? 0 : 130),
      }}
    >
      <div
        style={{
          position: 'absolute',
          top,
          fontFamily: F.round,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.1,
          color,
          letterSpacing: '-0.02em',
          opacity: s,
          transform: `translateY(${y}px)`,
          textShadow: shadow ? '0 6px 40px rgba(0,0,0,0.6)' : 'none',
          textAlign: align === 'center' ? 'center' : 'left',
          width: align === 'center' ? '100%' : 'auto',
          padding: align === 'center' ? '0 80px' : 0,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// bottom subtitle (works silent — narration-equivalent caption)
export const Caption: React.FC<{children: React.ReactNode; delay?: number}> = ({
  children,
  delay = 10,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [delay, delay + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(f, [delay, delay + 16], [22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
      <div
        style={{
          marginBottom: 96,
          maxWidth: 1400,
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.4,
          color: C.text,
          opacity: o,
          transform: `translateY(${y}px)`,
          textShadow: '0 4px 24px rgba(0,0,0,0.85)',
          padding: '0 60px',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// small honesty chip (lower-right)
export const HonestyChip: React.FC<{children: React.ReactNode; delay?: number}> = ({
  children,
  delay = 24,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [delay, delay + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        right: 56,
        bottom: 52,
        fontFamily: F.sans,
        fontWeight: 700,
        fontSize: 22,
        color: C.muted,
        background: 'rgba(8,14,28,0.6)',
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: 999,
        padding: '10px 20px',
        opacity: o * 0.95,
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </div>
  );
};

// scanning sweep line
export const ScanSweep: React.FC<{dur: number; color?: string}> = ({
  dur,
  color = C.teal,
}) => {
  const f = useCurrentFrame();
  const x = interpolate(f % dur, [0, dur], [-300, 1920], {});
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        width: 300,
        height: '100%',
        background: `linear-gradient(90deg, transparent, ${color}22, ${color}55, ${color}22, transparent)`,
        pointerEvents: 'none',
      }}
    />
  );
};
