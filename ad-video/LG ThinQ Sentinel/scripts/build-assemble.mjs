// Reconstructed composite + concat orchestrator (the step that didn't transfer).
// Per scene: warm bg + browser/phone frame + recorded dashboard footage + corrected
// text overlay (fade-in). Then xfade crossfade concat -> silent 1080p master.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const TMP = "/home/ubuntu/.claude/jobs/d186bb64/tmp";
const REC = TMP;                                  // recorded webm clips live here
const A = `${ROOT}/build/assets`;
const BG = `${ROOT}/build/promo2/bg.png`;
const OV = `${ROOT}/build/overlays`;
const SCN = `${ROOT}/build/scenes_new`;
const OUTSIL = `${ROOT}/build/PROMO_NEW_silent.mp4`;
const FPS = 30, W = 1920, H = 1080, XF = 0.5;     // crossfade seconds
rmSync(SCN, { recursive: true, force: true }); mkdirSync(SCN, { recursive: true });

const foot = (d) => { const f = execSync(`ls ${REC}/${d}/*.webm`).toString().trim().split("\n")[0]; return f; };
// desktop frame geom
const FW = 930, FH = 608, MYr = 236, SOX = 68, SOY = 93, VW = 794, VH = 446;
const desk = (side) => { const mX = side === "right" ? (W - FW - 72) : 72; return { mX, mY: MYr, vx: mX + SOX, vy: MYr + SOY }; };
// phone frame geom (PS 1.18)
const PFW = 581, PFH = 1067, PMX = 300, PMY = 7, PVX = 413, PVY = 119, PVW = 354, PVH = 840;

const SCENES = [
  { id: "intro", type: "title", dur: 5.0 },
  { id: "s_dark_alert", type: "desktop", side: "right", dur: 8.5, foot: "rec_control", ss: 4.0 },
  { id: "s_white_alert", type: "desktop", side: "left", dur: 8.5, foot: "rec_nurse", ss: 9.0 },
  { id: "s_patient", type: "desktop", side: "right", dur: 7.5, foot: "rec_nurse", ss: 1.0 },
  { id: "s_auto", type: "desktop", side: "left", dur: 8.5, foot: "rec_control", ss: 8.0 },
  { id: "s_app", type: "phone", dur: 7.5, foot: "rec_guardian_m", ss: 2.0 },
  { id: "s_report", type: "desktop", side: "left", dur: 8.5, foot: "rec_report", ss: 8.0 },
  { id: "endcard", type: "title", dur: 6.0 },
];

function renderScene(s) {
  const out = `${SCN}/${s.id}.mp4`;
  const ovl = `${OV}/${s.id}.png`;
  const fIn = `fade=t=in:st=0:d=0.5`;           // overlay fade-in
  if (s.type === "title") {
    // bg + centered overlay (overlay fades in)
    const fc = `[0:v]scale=${W}:${H},format=yuva420p[bg];[1:v]format=yuva420p,${fIn}[ov];[bg][ov]overlay=0:0,format=yuv420p[v]`;
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${out}"`, { stdio: "pipe" });
  } else if (s.type === "desktop") {
    const g = desk(s.side);
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${VW}:${VH},setsar=1[foot]`,
      `[3:v]scale=${VW}:${VH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${FW}:${FH}[back]`,
      `[4:v]scale=${FW}:${FH}[front]`,
      `[5:v]format=yuva420p,${fIn}[ov]`,
      `[bg][back]overlay=${g.mX}:${g.mY}[b1]`,
      `[b1][footm]overlay=${g.vx}:${g.vy}[b2]`,
      `[b2][front]overlay=${g.mX}:${g.mY}[b3]`,
      `[b3][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/frame/back.png" -i "${A}/frame/mask.png" -i "${A}/frame/front.png" -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${out}"`, { stdio: "pipe" });
  } else { // phone
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${PVW}:${PVH},setsar=1[foot]`,
      `[3:v]scale=${PVW}:${PVH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${PFW}:${PFH}[back]`,
      `[4:v]scale=${PFW}:${PFH}[front]`,
      `[5:v]format=yuva420p,${fIn}[ov]`,
      `[bg][back]overlay=${PMX}:${PMY}[b1]`,
      `[b1][footm]overlay=${PVX}:${PVY}[b2]`,
      `[b2][front]overlay=${PMX}:${PMY}[b3]`,
      `[b3][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/phoneframe/back.png" -i "${A}/phoneframe/mask.png" -i "${A}/phoneframe/front.png" -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${out}"`, { stdio: "pipe" });
  }
  console.log("scene", s.id, s.dur + "s");
}

for (const s of SCENES) renderScene(s);

// ---- xfade crossfade concat ----
const inputs = SCENES.map((s) => `-i "${SCN}/${s.id}.mp4"`).join(" ");
let filt = "", prev = "0:v", R = SCENES[0].dur;
for (let i = 1; i < SCENES.length; i++) {
  const off = (R - XF).toFixed(3);
  const lbl = i === SCENES.length - 1 ? "vout" : `x${i}`;
  filt += `[${prev}][${i}:v]xfade=transition=fade:duration=${XF}:offset=${off}[${lbl}];`;
  R = R + SCENES[i].dur - XF;
  prev = lbl;
}
filt = filt.replace(/;$/, "");
execSync(`ffmpeg -nostdin -y ${inputs} -filter_complex "${filt}" -map "[vout]" -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${OUTSIL}"`, { stdio: "pipe" });
console.log("SILENT MASTER:", OUTSIL, "total≈", R.toFixed(1) + "s");
