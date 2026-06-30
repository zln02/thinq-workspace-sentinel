import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';

const LINES = [
  '선행성·정확도는 외부 조기경보 시스템(UIS)의 모델 성능 · 예측은 UIS, Sentinel은 라스트마일 대응',
  '실증 = 코웨이 공기청정기 1종 실연동 · 시연구간 201호 · 그 외 가전 제어계획(시뮬) · LG ThinQ 지향',
  '영상 비저장 — 카메라는 인원수만 추출 · 의료기기 아님 · PoC 단계 · 파일럿 문의',
];

export const Cut8: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 12, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#04060c', opacity: o, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontFamily: F.round, fontWeight: 800, fontSize: 32, color: C.teal, marginBottom: 28, letterSpacing: '0.04em'}}>● 정직한 고지</div>
      <div style={{width: 1340}}>
        {LINES.map((l, i) => {
          const lo = interpolate(f, [4 + i * 5, 14 + i * 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={i} style={{fontFamily: F.sans, fontWeight: 700, fontSize: 26, color: C.muted, textAlign: 'center', lineHeight: 1.75, opacity: lo}}>{l}</div>
          );
        })}
      </div>
      <div style={{marginTop: 30, fontFamily: F.round, fontWeight: 800, fontSize: 24, color: C.faint, opacity: interpolate(f, [22, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        ThinQ Space Sentinel
      </div>
    </AbsoluteFill>
  );
};
