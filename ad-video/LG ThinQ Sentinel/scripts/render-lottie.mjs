// Offline Lottie -> transparent PNG sequence renderer using CanvasKit/Skottie.
// Mirrors the player's render path (MakeManagedAnimation -> seekFrame -> render)
// but draws into a raster surface and snapshots each frame as a PNG with alpha.
//
// Usage:
//   node scripts/render-lottie.mjs <lottie.json> <outDir> [--w 1920] [--h 1080]
//       [--fps N] [--scale S] [--bg transparent|#RRGGBB] [--assets <dir>]
//
// Width/height default to the animation's intrinsic size * scale. Frame range
// follows the animation's own duration. Fonts/images can be supplied via --assets
// (a folder whose files are loaded into the Skottie asset map by bare filename).

import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) opt[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { pos, opt };
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const lottiePath = resolve(pos[0] ?? "");
const outDir = resolve(pos[1] ?? "");
if (!pos[0] || !pos[1]) {
  console.error("usage: node scripts/render-lottie.mjs <lottie.json> <outDir> [--w --h --fps --scale --bg --assets]");
  process.exit(1);
}

const wasmPath = resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm");
const ck = await CanvasKitInit({ locateFile: () => wasmPath });

const json = await readFile(lottiePath, "utf8");

// Load optional assets (images, fonts) by bare filename into the Skottie map.
let assets;
if (opt.assets) {
  assets = {};
  const dir = resolve(opt.assets);
  for (const name of await readdir(dir)) {
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(name)) continue; // images only
    assets[name] = new Uint8Array(await readFile(join(dir, name)));
  }
}

const anim = assets
  ? ck.MakeManagedAnimation(json, assets)
  : ck.MakeManagedAnimation(json);
if (!anim) {
  console.error("Failed to parse Lottie (MakeManagedAnimation returned null).");
  process.exit(1);
}

const [iw, ih] = anim.size();
const scale = opt.scale ? Number(opt.scale) : 1;
const W = Math.round(opt.w ? Number(opt.w) : iw * scale);
const H = Math.round(opt.h ? Number(opt.h) : ih * scale);
const fps = opt.fps ? Number(opt.fps) : (anim.fps() || 60);
const totalFrames = Math.max(1, Math.round(anim.duration() * fps));

// Fit the animation into WxH preserving aspect (same letterbox math as the player).
const fit = Math.min(W / iw, H / ih);
const dw = iw * fit;
const dh = ih * fit;
const left = (W - dw) / 2;
const top = (H - dh) / 2;
const destRect = ck.LTRBRect(left, top, left + dw, top + dh);

const transparent = !opt.bg || opt.bg === "transparent";
let bgColor = ck.TRANSPARENT;
if (!transparent) {
  const hex = opt.bg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  bgColor = ck.Color4f(r, g, b, 1);
}

await mkdir(outDir, { recursive: true });

const surface = ck.MakeSurface(W, H);
if (!surface) {
  console.error("Could not create raster surface.");
  process.exit(1);
}
const canvas = surface.getCanvas();

console.log(`render ${basename(lottiePath)}: ${iw}x${ih} -> ${W}x${H}, ${totalFrames} frames @ ${fps}fps, bg=${transparent ? "transparent" : opt.bg}`);

for (let f = 0; f < totalFrames; f++) {
  canvas.clear(bgColor);
  anim.seekFrame(f);
  anim.render(canvas, destRect);
  surface.flush();
  const img = surface.makeImageSnapshot();
  const png = img.encodeToBytes(); // PNG, preserves alpha
  await writeFile(join(outDir, `frame_${String(f).padStart(5, "0")}.png`), Buffer.from(png));
  img.delete();
}

surface.delete();
anim.delete();
console.log(`done -> ${outDir} (${totalFrames} png)`);
