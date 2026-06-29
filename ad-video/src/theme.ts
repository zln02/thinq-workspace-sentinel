// ThinQ Space Sentinel — booth ad theme
export const C = {
  // base
  bg0: '#070B16',
  bg1: '#0B1224',
  bg2: '#111B33',
  // text
  text: '#F7FAFF',
  muted: '#9FB0CC',
  faint: '#62718C',
  // 5-tier / data
  teal: '#2DD4BF',
  cyan: '#38BDF8',
  green: '#34D399',
  amber: '#F4B860',
  orange: '#FB923C',
  red: '#F2545B',
  // brand
  lgRed: '#A50034', // LG전자 brand red
  warm: '#F6D9A0',
};

export const F = {
  sans: "'NanumSquare', 'Noto Sans KR', sans-serif",
  round: "'NanumSquareRound', 'NanumSquare', sans-serif",
};

export const FPS = 30;
// cut frame plan (30fps) — total 2040 = 68s
export const PLAN = {
  c1: {from: 0, dur: 240},     // 0-8s  hook
  c2: {from: 240, dur: 240},   // 8-16s human weight
  c3: {from: 480, dur: 420},   // 16-30s ★UIS data punch
  c4: {from: 900, dur: 300},   // 30-40s reads signals
  c5: {from: 1200, dur: 360},  // 40-52s ★preemptive, space acts
  c6: {from: 1560, dur: 180},  // 52-58s evidence/record
  c7: {from: 1740, dur: 240},  // 58-66s brand close
  c8: {from: 1980, dur: 60},   // 66-68s disclosure endcard -> loop
};
export const TOTAL = 2040;
