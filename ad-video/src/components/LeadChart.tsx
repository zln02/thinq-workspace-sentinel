import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';

const W = 1180;
const H = 360;

function bell(cx: number, amp: number, spread: number) {
  // returns path d over [0..W], baseline at H
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 8) {
    const y = H - amp * Math.exp(-Math.pow((x - cx) / spread, 2));
    pts.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export const LeadChart: React.FC<{delay?: number}> = ({delay = 0}) => {
  const f = useCurrentFrame() - delay;

  const uisCx = W * 0.34;
  const kcdcCx = W * 0.70;
  const uisPath = bell(uisCx, 250, 150);
  const kcdcPath = bell(kcdcCx, 300, 150);

  // draw progress
  const drawUis = interpolate(f, [10, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const drawKcdc = interpolate(f, [55, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const len = 2600;

  const gapO = interpolate(f, [120, 145], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <svg width={W} height={H + 60} viewBox={`0 0 ${W} ${H + 60}`} style={{overflow: 'visible'}}>
      {/* baseline */}
      <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />

      {/* KCDC confirmed (lagging, red) */}
      <path
        d={kcdcPath}
        fill="none"
        stroke={C.red}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - drawKcdc)}
        opacity={0.95}
        style={{filter: `drop-shadow(0 0 12px ${C.red}88)`}}
      />
      {/* UIS early warning (leading, teal) */}
      <path
        d={uisPath}
        fill="none"
        stroke={C.teal}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - drawUis)}
        style={{filter: `drop-shadow(0 0 14px ${C.teal})`}}
      />

      {/* peak markers */}
      <circle cx={uisCx} cy={H - 250} r={9} fill={C.teal} opacity={drawUis} />
      <circle cx={kcdcCx} cy={H - 300} r={9} fill={C.red} opacity={drawKcdc} />

      {/* gap bracket */}
      <g opacity={gapO}>
        <line x1={uisCx} y1={H - 250} x2={uisCx} y2={H + 14} stroke={C.teal} strokeWidth={1.5} strokeDasharray="5 5" />
        <line x1={kcdcCx} y1={H - 300} x2={kcdcCx} y2={H + 14} stroke={C.red} strokeWidth={1.5} strokeDasharray="5 5" />
        <line x1={uisCx} y1={H + 14} x2={kcdcCx} y2={H + 14} stroke={C.amber} strokeWidth={2.5} />
        <polygon points={`${uisCx},${H + 14} ${uisCx + 12},${H + 8} ${uisCx + 12},${H + 20}`} fill={C.amber} />
        <polygon points={`${kcdcCx},${H + 14} ${kcdcCx - 12},${H + 8} ${kcdcCx - 12},${H + 20}`} fill={C.amber} />
        <text
          x={(uisCx + kcdcCx) / 2}
          y={H + 48}
          textAnchor="middle"
          fill={C.amber}
          fontFamily={F.round}
          fontWeight={800}
          fontSize={30}
        >
          최대 43일 먼저
        </text>
      </g>

      {/* labels */}
      <text x={uisCx} y={H - 268} textAnchor="middle" fill={C.teal} fontFamily={F.sans} fontWeight={700} fontSize={24} opacity={drawUis}>
        외부 조기경보 (UIS)
      </text>
      <text x={kcdcCx} y={H - 318} textAnchor="middle" fill={C.red} fontFamily={F.sans} fontWeight={700} fontSize={24} opacity={drawKcdc}>
        확진 환자 (KCDC)
      </text>
    </svg>
  );
};
