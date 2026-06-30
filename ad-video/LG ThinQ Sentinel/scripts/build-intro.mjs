// Builds the intro scene (logo lockup -> hook line) as a Lottie doc plus its
// pre-rendered Korean text PNGs. Output: build/intro/{lottie.json, assets/*.png}
import CanvasKitInit from "canvaskit-wasm/full";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";
import * as L from "./lottie-lib.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "build/intro");
const ASSETS = join(OUT, "assets");
const FONT_B = resolve(ROOT, "assets/fonts/Malgun-Bold.ttf");
const FONT_R = resolve(ROOT, "assets/fonts/Malgun-Regular.ttf");

const GREEN = "#0A6555";
const DARK = "#15241F";
const MUTED = "#6B7B76";

const wasmPath = resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm");
const ck = await CanvasKitInit({ locateFile: () => wasmPath });

await mkdir(ASSETS, { recursive: true });

// --- render text pieces ---
async function piece(name, opts) {
  const r = await renderText(ck, opts);
  await writeFile(join(ASSETS, name), r.buffer);
  return { file: name, w: r.width, h: r.height };
}

const wmDark  = await piece("wm_dark.png",  { text: "LG ThinQ Space ", fontPath: FONT_B, size: 82, color: DARK,  letter: -1, pad: 6 });
const wmGreen = await piece("wm_green.png", { text: "Sentinel",        fontPath: FONT_B, size: 82, color: GREEN, letter: -1, pad: 6 });
const sub     = await piece("sub.png",      { text: "AI 감염 예방 · 자동 방역 관제 시스템", fontPath: FONT_R, size: 31, color: MUTED, letter: 0, pad: 6 });
const hook    = await piece("hook.png",     { text: "감염병, 터지기 전에 막습니다", fontPath: FONT_B, size: 100, color: DARK, letter: -1.5, pad: 8 });

// --- layout ---
const CX = 960;
const PULSE_Y = 372;
const wmTotal = wmDark.w + wmGreen.w;
const wmLeft = CX - wmTotal / 2;
const wmY = 508;
const wmDarkCx = wmLeft + wmDark.w / 2;
const wmGreenCx = wmLeft + wmDark.w + wmGreen.w / 2;
const subY = 588;
const hookY = 520;
const hookLeft = CX - hook.w / 2;
const underlineW = hook.w - 16;
const underlineY = hookY + hook.h / 2 + 26;

const OP = 420; // 7.0s @ 60fps

// --- assets ---
const assets = [
  L.imageAsset({ id: "wmDark", w: wmDark.w, h: wmDark.h, file: wmDark.file }),
  L.imageAsset({ id: "wmGreen", w: wmGreen.w, h: wmGreen.h, file: wmGreen.file }),
  L.imageAsset({ id: "sub", w: sub.w, h: sub.h, file: sub.file }),
  L.imageAsset({ id: "hook", w: hook.w, h: hook.h, file: hook.file }),
];

// helpers for image layer transforms (anchor at image center, p = desired center)
const imgKS = ({ w, h, cx, cy, riseFrom, fadeIn, fadeOut }) => L.transform({
  a: [w / 2, h / 2, 0],
  p: riseFrom
    ? L.animated([[fadeIn[0], [cx, cy + riseFrom, 0], "out"], [fadeIn[1] + 6, [cx, cy, 0]]])
    : [cx, cy, 0],
  o: L.fade({ inA: fadeIn[0], inB: fadeIn[1], outA: fadeOut?.[0], outB: fadeOut?.[1] }),
});

const layers = [];

// pulse ring (single elegant expand on entrance)
layers.push(L.shapeLayer({
  nm: "pulse",
  ip: 0, op: OP,
  ks: L.transform({ p: [CX, PULSE_Y, 0] }),
  shapes: [
    L.group([
      L.ellipse({ size: [120, 120] }),
      L.stroke(L.hex(GREEN), 3),
      L.shapeTransform({
        s: L.animated([[6, [10, 10], "out"], [78, [150, 150]]]),
        o: L.animated([[6, [70], "out"], [78, [0]]]),
      }),
    ], "ring"),
  ],
}));

// steady center dot
layers.push(L.shapeLayer({
  nm: "dot",
  ip: 0, op: OP,
  ks: L.transform({ p: [CX, PULSE_Y, 0], o: L.fade({ inA: 6, inB: 22, outA: 168, outB: 192 }) }),
  shapes: [
    L.group([
      L.ellipse({ size: [20, 20] }),
      L.fill(L.hex(GREEN)),
      L.shapeTransform({}),
    ], "dotg"),
  ],
}));

// wordmark dark
layers.push(L.imageLayer({
  id: "wmDark", refId: "wmDark", w: wmDark.w, h: wmDark.h, op: OP,
  ks: imgKS({ w: wmDark.w, h: wmDark.h, cx: wmDarkCx, cy: wmY, riseFrom: 26, fadeIn: [20, 52], fadeOut: [165, 190] }),
}));
// wordmark green ("Sentinel") — same motion
layers.push(L.imageLayer({
  id: "wmGreen", refId: "wmGreen", w: wmGreen.w, h: wmGreen.h, op: OP,
  ks: imgKS({ w: wmGreen.w, h: wmGreen.h, cx: wmGreenCx, cy: wmY, riseFrom: 26, fadeIn: [26, 58], fadeOut: [165, 190] }),
}));
// subtitle
layers.push(L.imageLayer({
  id: "sub", refId: "sub", w: sub.w, h: sub.h, op: OP,
  ks: imgKS({ w: sub.w, h: sub.h, cx: CX, cy: subY, riseFrom: 16, fadeIn: [50, 76], fadeOut: [160, 185] }),
}));

// hook line
layers.push(L.imageLayer({
  id: "hook", refId: "hook", w: hook.w, h: hook.h, op: OP,
  ks: imgKS({ w: hook.w, h: hook.h, cx: CX, cy: hookY, riseFrom: 34, fadeIn: [205, 244] }),
}));
// green underline swipe (left-anchored scaleX)
layers.push(L.shapeLayer({
  nm: "underline",
  ip: 0, op: OP,
  ks: L.transform({ p: [hookLeft, underlineY, 0] }),
  shapes: [
    L.group([
      L.rect({ size: [underlineW, 8], pos: [underlineW / 2, 0], round: 4 }),
      L.fill(L.hex(GREEN)),
      L.shapeTransform({
        a: [0, 0],
        s: L.animated([[248, [0, 100], "out"], [282, [100, 100]]]),
        o: L.fade({ inA: 248, inB: 252 }),
      }),
    ], "ul"),
  ],
}));

const out = L.doc({ w: 1920, h: 1080, fr: 60, op: OP, nm: "LG ThinQ Space Sentinel — Intro", assets, layers });
await writeFile(join(OUT, "lottie.json"), JSON.stringify(out));
console.log(`intro built -> ${join(OUT, "lottie.json")} (${OP} frames). wm=${wmTotal}px hook=${hook.w}px`);
