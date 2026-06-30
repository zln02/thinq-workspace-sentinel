import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';

const SIGNALS = [
  {label: '호흡기', sub: '병의원·약국', color: C.cyan},
  {label: '행동', sub: '검색·OTC 구매', color: C.amber},
  {label: '환경', sub: '하수 RNA·기온', color: C.teal},
];

// rotating model core fed by 3 signals, output curve tracks the real clinical curve
export const UISModel: React.FC<{delay?: number}> = ({delay = 0}) => {
  const f = useCurrentFrame() - delay;
  const rot = f * 0.9; // deg
  const cx = 330;
  const cy = 300;
  const R = 200;

  return (
    <svg width={1640} height={620} viewBox="0 0 1640 620" style={{overflow: 'visible'}}>
      {/* ===== left: model core + 3 orbiting signals ===== */}
      {/* connecting lines with travelling pulses */}
      {SIGNALS.map((s, i) => {
        const ang = (rot + i * 120) * (Math.PI / 180);
        const sx = cx + Math.cos(ang) * R;
        const sy = cy + Math.sin(ang) * R;
        const appear = interpolate(f, [10 + i * 8, 30 + i * 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        // pulse position travelling from node to core
        const t = ((f * 0.02 + i * 0.33) % 1);
        const px = sx + (cx - sx) * t;
        const py = sy + (cy - sy) * t;
        return (
          <g key={i} opacity={appear}>
            <line x1={sx} y1={sy} x2={cx} y2={cy} stroke={`${s.color}66`} strokeWidth={2} />
            <circle cx={px} cy={py} r={5} fill={s.color} style={{filter: `drop-shadow(0 0 6px ${s.color})`}} />
            {/* signal node */}
            <circle cx={sx} cy={sy} r={48} fill={`${s.color}22`} stroke={s.color} strokeWidth={2.5} />
            <text x={sx} y={sy - 4} textAnchor="middle" fill={C.text} fontFamily={F.round} fontWeight={800} fontSize={26}>{s.label}</text>
            <text x={sx} y={sy + 20} textAnchor="middle" fill={s.color} fontFamily={F.sans} fontWeight={700} fontSize={15}>{s.sub}</text>
          </g>
        );
      })}
      {/* rotating core rings */}
      <g>
        <circle cx={cx} cy={cy} r={92} fill="rgba(8,16,30,0.85)" stroke={`${C.teal}`} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={108} fill="none" stroke={`${C.teal}55`} strokeWidth={2} strokeDasharray="10 14" style={{transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${rot}deg)`}} />
        <circle cx={cx} cy={cy} r={126} fill="none" stroke={`${C.cyan}33`} strokeWidth={1.5} strokeDasharray="4 18" style={{transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${-rot * 0.6}deg)`}} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill={C.text} fontFamily={F.round} fontWeight={800} fontSize={30}>UIS</text>
        <text x={cx} y={cy + 22} textAnchor="middle" fill={C.teal} fontFamily={F.sans} fontWeight={700} fontSize={18}>조기경보 모델</text>
        <text x={cx} y={cy + 48} textAnchor="middle" fill={C.muted} fontFamily={F.sans} fontWeight={700} fontSize={16}>F1 0.907</text>
      </g>

      {/* arrow to chart */}
      <g opacity={interpolate(f, [40, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
        <line x1={cx + 140} y1={cy} x2={cx + 300} y2={cy} stroke={C.teal} strokeWidth={3} />
        <polygon points={`${cx + 300},${cy} ${cx + 286},${cy - 9} ${cx + 286},${cy + 9}`} fill={C.teal} />
      </g>

      {/* ===== right: model-vs-actual tracking chart ===== */}
      <ModelChart f={f} ox={800} oy={70} w={760} h={420} />
    </svg>
  );
};

const ModelChart: React.FC<{f: number; ox: number; oy: number; w: number; h: number}> = ({f, ox, oy, w, h}) => {
  // build a seasonal curve; model leads actual slightly and tracks closely
  const base = (x: number, shift: number) => {
    const cx = w * 0.62 + shift;
    return h - 40 - (h - 90) * Math.exp(-Math.pow((x - cx) / (w * 0.16), 2));
  };
  const actualPts: string[] = [];
  const modelPts: string[] = [];
  for (let x = 0; x <= w; x += 10) {
    actualPts.push(`${x === 0 ? 'M' : 'L'}${(ox + x).toFixed(1)},${(oy + base(x, 0)).toFixed(1)}`);
    modelPts.push(`${x === 0 ? 'M' : 'L'}${(ox + x).toFixed(1)},${(oy + base(x, -w * 0.13)).toFixed(1)}`);
  }
  const len = 2200;
  const drawA = interpolate(f, [55, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const drawM = interpolate(f, [70, 140], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labO = interpolate(f, [140, 165], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <g>
      <line x1={ox} y1={oy + h - 40} x2={ox + w} y2={oy + h - 40} stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
      {/* actual clinical (KCDC) */}
      <path d={actualPts.join(' ')} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeDasharray={len} strokeDashoffset={len * (1 - drawA)} opacity={0.85} />
      {/* model prediction (leads + tracks) */}
      <path d={modelPts.join(' ')} fill="none" stroke={C.teal} strokeWidth={5} strokeDasharray={len} strokeDashoffset={len * (1 - drawM)} style={{filter: `drop-shadow(0 0 12px ${C.teal})`}} />
      {/* legend */}
      <g opacity={labO}>
        <rect x={ox + 12} y={oy + 6} width={26} height={6} fill="#FFFFFF" rx={3} />
        <text x={ox + 46} y={oy + 14} fill={C.text} fontFamily={F.sans} fontWeight={700} fontSize={20}>실제 인플루엔자 확진 (KCDC)</text>
        <rect x={ox + 12} y={oy + 34} width={26} height={6} fill={C.teal} rx={3} />
        <text x={ox + 46} y={oy + 42} fill={C.teal} fontFamily={F.sans} fontWeight={700} fontSize={20}>UIS 모델 예측 — 선행 추적</text>
      </g>
    </g>
  );
};
