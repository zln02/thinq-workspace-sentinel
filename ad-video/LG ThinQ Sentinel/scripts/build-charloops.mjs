// Build seamless lottie idle loops (breathing + sway + bob) for each cameo character,
// render to transparent PNG sequence, then (caller) encode to qtrle MOV with alpha.
import * as L from "./lottie-lib.mjs";
import { writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
const ROOT = resolve(".");
const CH = `${ROOT}/assets/chars`;
const TMP = "/home/ubuntu/.claude/jobs/d186bb64/tmp/cl";
const OUT = `${ROOT}/assets/charloops`;
mkdirSync(OUT, { recursive: true });
const dim = (f) => execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 "${f}"`).toString().trim().split(",").map(Number);

// chars to loop (idle breathing+sway)
const CHARS = ["hero_point", "nurse_f", "caregiver_f", "doctor_f", "manager_m", "patient_f"];
const FR = 30, DUR = 90; // 3s seamless

for (const name of CHARS) {
  const src = `${CH}/${name}.png`;
  const [CW, CH2] = dim(src);
  const PAD = 80, W = CW + PAD * 2, H = CH2 + PAD * 2;
  const ax = CW / 2, ay = CH2, px = W / 2, py = PAD + CH2;
  const half = DUR / 2;
  const s = L.animated([[0, [100, 100, 100], "inOut"], [half, [101.6, 98.4, 100], "inOut"], [DUR, [100, 100, 100]]]);
  const r = L.animated([[0, [-1.8], "inOut"], [half, [1.8], "inOut"], [DUR, [-1.8]]]);
  const p = L.animated([[0, [px, py, 0], "inOut"], [half, [px, py - 7, 0], "inOut"], [DUR, [px, py, 0]]]);
  const ks = L.transform({ a: [ax, ay, 0], p, s, r, o: 100 });
  const layer = L.imageLayer({ id: "c", refId: "c", w: CW, h: CH2, op: DUR, ks });
  const d = L.doc({ w: W, h: H, fr: FR, op: DUR, nm: name, assets: [L.imageAsset({ id: "c", w: CW, h: CH2, file: "c.png" })], layers: [layer] });
  const wdir = `${TMP}/${name}`; rmSync(wdir, { recursive: true, force: true }); mkdirSync(`${wdir}/a`, { recursive: true });
  cpSync(src, `${wdir}/a/c.png`);
  writeFileSync(`${wdir}/${name}.json`, JSON.stringify(d));
  execSync(`node scripts/render-lottie.mjs "${wdir}/${name}.json" "${wdir}/frames" --assets "${wdir}/a" --bg transparent`, { stdio: "pipe" });
  // encode qtrle mov (alpha)
  execSync(`ffmpeg -nostdin -y -framerate ${FR} -i "${wdir}/frames/frame_%05d.png" -c:v qtrle -pix_fmt argb "${OUT}/${name}.mov"`, { stdio: "pipe" });
  console.log("loop", name, `${W}x${H}`);
}
console.log("DONE charloops");
