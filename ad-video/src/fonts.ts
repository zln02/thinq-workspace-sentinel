import {NANUM_R, NANUM_B, NANUM_ROUND} from './fontData';

let loaded = false;

// Inject @font-face with inlined base64 data URIs. No network fetch, no delayRender,
// so it cannot hang render workers. Chrome rasterizes data-URI fonts before painting.
export function ensureFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const css = `
@font-face{font-family:'NanumSquare';src:url(${NANUM_R}) format('truetype');font-weight:400;font-display:block;}
@font-face{font-family:'NanumSquare';src:url(${NANUM_B}) format('truetype');font-weight:700;font-display:block;}
@font-face{font-family:'NanumSquareRound';src:url(${NANUM_ROUND}) format('truetype');font-weight:800;font-display:block;}
`;
  const style = document.createElement('style');
  style.setAttribute('data-sentinel-fonts', '1');
  style.textContent = css;
  document.head.appendChild(style);
  // kick the font loads (fire-and-forget; data URIs resolve synchronously)
  try {
    void document.fonts.load('400 40px NanumSquare');
    void document.fonts.load('700 40px NanumSquare');
    void document.fonts.load('800 40px NanumSquareRound');
  } catch {
    /* noop */
  }
}
