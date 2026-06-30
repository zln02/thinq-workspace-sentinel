// Wrap a screenshot in a sleek browser-window mockup: rounded corners, optional
// top bar with traffic-light dots, and a soft drop shadow. Outputs a transparent
// PNG (so it can float over any background) plus a {width,height} meta JSON.
//
// Usage:
//   node scripts/mockup.mjs <in.png> <out.png> [--radius 22] [--bar 1|0]
//     [--barcolor #11201C] [--shadow 60] [--shadowcolor #000000] [--shadowalpha 0.45]
//     [--pad 90] [--scale 1] [--meta out.json] [--glow #0A6555] [--glowalpha 0]

import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const A = (() => { const p=[],o={}; const a=process.argv.slice(2);
  for(let i=0;i<a.length;i++){ if(a[i].startsWith("--")) o[a[i].slice(2)]=a[++i]; else p.push(a[i]); } return {p,o}; })();

const inPath = resolve(A.p[0]); const outPath = resolve(A.p[1]);
const radius = Number(A.o.radius ?? 22);
const bar = A.o.bar == null ? true : A.o.bar !== "0";
const barH = bar ? Math.round(radius * 1.7) : 0;
const shadow = Number(A.o.shadow ?? 60);
const shadowAlpha = Number(A.o.shadowalpha ?? 0.45);
const pad = Number(A.o.pad ?? 90);
const scale = Number(A.o.scale ?? 1);
const glowAlpha = Number(A.o.glowalpha ?? 0);

function hexRGBA(ck,h,a=1){const s=(h??"#000000").replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);}

const wasmPath = resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm");
const ck = await CanvasKitInit({ locateFile: () => wasmPath });

const img = ck.MakeImageFromEncoded(await readFile(inPath));
if (!img) { console.error("decode failed"); process.exit(1); }
const iw = img.width(), ih = img.height();
const sw = Math.round(iw * scale), sh = Math.round(ih * scale);

// window dims (image + optional bar)
const winW = sw, winH = sh + barH;
const W = winW + pad * 2, H = winH + pad * 2;

const surface = ck.MakeSurface(W, H);
const canvas = surface.getCanvas();
canvas.clear(ck.TRANSPARENT);

const winRect = ck.LTRBRect(pad, pad, pad + winW, pad + winH);
const rr = ck.RRectXY(winRect, radius, radius);

// --- drop shadow ---
const shp = new ck.Paint();
shp.setColor(hexRGBA(ck, A.o.shadowcolor ?? "#03100B", shadowAlpha));
shp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, shadow / 2, true));
canvas.save();
canvas.translate(0, shadow * 0.28);
canvas.drawRRect(rr, shp);
canvas.restore();

// --- optional outer glow ---
if (glowAlpha > 0) {
  const gp = new ck.Paint();
  gp.setColor(hexRGBA(ck, A.o.glow ?? "#0A6555", glowAlpha));
  gp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, shadow, true));
  canvas.drawRRect(rr, gp);
}

// --- window body ---
canvas.save();
canvas.clipRRect(rr, ck.ClipOp.Intersect, true);

// title bar
if (bar) {
  const barPaint = new ck.Paint();
  barPaint.setColor(hexRGBA(ck, A.o.barcolor ?? "#0E1A16", 1));
  canvas.drawRect(ck.LTRBRect(pad, pad, pad + winW, pad + barH), barPaint);
  const dots = ["#FF5F57", "#FEBC2E", "#28C840"];
  for (let i = 0; i < 3; i++) {
    const dp = new ck.Paint(); dp.setAntiAlias(true);
    dp.setColor(hexRGBA(ck, dots[i], 1));
    canvas.drawCircle(pad + 26 + i * 26, pad + barH / 2, 8, dp);
  }
}

// screenshot
const dst = ck.LTRBRect(pad, pad + barH, pad + sw, pad + barH + sh);
const sp = new ck.Paint(); sp.setAntiAlias(true);
canvas.drawImageRect(img, ck.LTRBRect(0, 0, iw, ih), dst, sp);
canvas.restore();

// subtle 1px inner border for crispness
const bp = new ck.Paint();
bp.setStyle(ck.PaintStyle.Stroke); bp.setStrokeWidth(2); bp.setAntiAlias(true);
bp.setColor(hexRGBA(ck, "#FFFFFF", 0.06));
canvas.drawRRect(rr, bp);

surface.flush();
const out = Buffer.from(surface.makeImageSnapshot().encodeToBytes());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out);
if (A.o.meta) await writeFile(resolve(A.o.meta), JSON.stringify({ width: W, height: H, winW, winH, pad, barH }));
console.log(`mockup ${iw}x${ih} -> ${outPath} (${W}x${H})`);
