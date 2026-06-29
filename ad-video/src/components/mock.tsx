import React from 'react';
import {AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';

type KF = {at: number; scale: number; x: number; y: number};
type CursorKF = {at: number; x: number; y: number; click?: boolean};
type Pulse = {at: number; dur?: number; x: number; y: number; w: number; h: number; color?: string};

function lerpKF(frame: number, kfs: KF[]) {
  const ats = kfs.map((k) => k.at);
  const sc = interpolate(frame, ats, kfs.map((k) => k.scale), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const x = interpolate(frame, ats, kfs.map((k) => k.x), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(frame, ats, kfs.map((k) => k.y), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {sc, x, y};
}

// Animated cursor with click ripple
const Cursor: React.FC<{kfs: CursorKF[]}> = ({kfs}) => {
  const f = useCurrentFrame();
  if (kfs.length === 0) return null;
  const ats = kfs.map((k) => k.at);
  const x = interpolate(f, ats, kfs.map((k) => k.x), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(f, ats, kfs.map((k) => k.y), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // click ripples
  const ripples = kfs.filter((k) => k.click).map((k, i) => {
    const dt = f - k.at;
    if (dt < 0 || dt > 22) return null;
    const r = interpolate(dt, [0, 22], [0, 70]);
    const o = interpolate(dt, [0, 22], [0.6, 0]);
    return (
      <div key={i} style={{position: 'absolute', left: k.x, top: k.y, width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: '50%', border: `3px solid ${C.teal}`, opacity: o}} />
    );
  });
  // press scale
  const nearClick = kfs.find((k) => k.click && Math.abs(f - k.at) < 5);
  const press = nearClick ? 0.82 : 1;
  return (
    <>
      {ripples}
      <div style={{position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: 'top left', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))', zIndex: 30}}>
        <svg width="42" height="42" viewBox="0 0 24 24">
          <path d="M4 2 L20 12 L13 13 L17 21 L13 22 L9 14 L4 18 Z" fill="white" stroke="#0a0f1c" strokeWidth="1.2" />
        </svg>
      </div>
    </>
  );
};

const Pulses: React.FC<{pulses: Pulse[]}> = ({pulses}) => {
  const f = useCurrentFrame();
  return (
    <>
      {pulses.map((p, i) => {
        const dur = p.dur ?? 60;
        const dt = f - p.at;
        if (dt < 0 || dt > dur) return null;
        const glow = 0.4 + 0.6 * Math.abs(Math.sin(dt / 7));
        return (
          <div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: 14, border: `3px solid ${p.color ?? C.amber}`, boxShadow: `0 0 ${20 + glow * 30}px ${p.color ?? C.amber}`, opacity: 0.9}} />
        );
      })}
    </>
  );
};

// Mockup shot: browser-framed live screenshot with zoom/pan keyframes, cursor, pulses
export const MockShot: React.FC<{
  src: string;
  dur: number;
  label?: string;
  glow?: string;
  zoom?: KF[];
  cursor?: CursorKF[];
  pulses?: Pulse[];
  frameW?: number;
  frameH?: number;
}> = ({src, dur, label = 'LIVE 대시보드', glow = C.teal, zoom, cursor = [], pulses = [], frameW = 1640, frameH = 924}) => {
  const f = useCurrentFrame();
  const kfs = zoom ?? [
    {at: 0, scale: 1.04, x: 0, y: 0},
    {at: dur, scale: 1.12, x: 0, y: 0},
  ];
  const {sc, x, y} = lerpKF(f, kfs);
  const glowPulse = 0.5 + 0.5 * Math.sin(f / 16);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: frameW,
          height: frameH + 38,
          borderRadius: 18,
          overflow: 'hidden',
          border: `1.5px solid ${glow}99`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 ${40 + glowPulse * 50}px ${glow}55`,
          background: '#0c1424',
        }}
      >
        <div style={{height: 38, background: 'linear-gradient(180deg,#1a2640,#121b30)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8}}>
          <span style={{width: 12, height: 12, borderRadius: '50%', background: '#ff5f57'}} />
          <span style={{width: 12, height: 12, borderRadius: '50%', background: '#febc2e'}} />
          <span style={{width: 12, height: 12, borderRadius: '50%', background: '#28c840'}} />
          <span style={{marginLeft: 16, fontFamily: F.sans, fontSize: 18, fontWeight: 700, color: glow}}>● {label}</span>
        </div>
        <div style={{position: 'relative', width: frameW, height: frameH, overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, transform: `scale(${sc}) translate(${x}px, ${y}px)`, transformOrigin: 'center center'}}>
            <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}} />
            <Pulses pulses={pulses} />
            <Cursor kfs={cursor} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
