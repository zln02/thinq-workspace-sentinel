// v3 assembler — character-driven. Feature scenes: bg+frame+footage+overlay+character cameo.
// Title scenes (intro/outro): hero doctor vs virus + logo lockup. xfade concat + BGM.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const REC = "/home/ubuntu/.claude/jobs/d186bb64/tmp";
const A = `${ROOT}/build/assets`;
const CH = `${ROOT}/assets/chars`;
const BG = `${ROOT}/build/promo2/bg.png`;
const OV = `${ROOT}/build/overlays`;
const SCN = `${ROOT}/build/scenes_v3`;
const OUTSIL = `${ROOT}/build/PROMO_V3_silent.mp4`;
const FPS = 30, W = 1920, H = 1080;
rmSync(SCN, { recursive: true, force: true }); mkdirSync(SCN, { recursive: true });
const foot = (d) => execSync(`ls ${REC}/${d}/*.webm`).toString().trim().split("\n")[0];

const FW = 930, FH = 608, MYr = 236, SOX = 68, SOY = 93, VW = 794, VH = 446;
const desk = (side) => { const mX = side === "right" ? (W - FW - 72) : 72; return { mX, mY: MYr, vx: mX + SOX, vy: MYr + SOY }; };
// phone on right
const PFW = 581, PFH = 1067, PMX = 1190, PMY = 7, PVX = PMX + 113, PVY = 119, PVW = 354, PVH = 840;

// character cameo overlay expr (fade-in + gentle bob), anchored bottom
const camExpr = (charH) => `format=yuva420p,scale=-1:${charH},fade=t=in:st=0.1:d=0.6:alpha=1[ch]`;
const camPos = (side, charW) => { const x = side === "left" ? 24 : (W - charW - 24); return x; };

const SCENES = [
  { id: "intro", type: "intro", dur: 6.0 },
  { id: "s_epidemic", type: "desktop", side: "right", dur: 9.0, foot: "rec_epidemic", ss: 3.0, char: "hero_point", cs: "right", chH: 470 },
  { id: "s_nurse", type: "desktop", side: "left", dur: 9.0, foot: "rec_nurse", ss: 9.0, char: "nurse_f", cs: "left", chH: 460 },
  { id: "s_patient", type: "desktop", side: "right", dur: 8.5, foot: "rec_patient", ss: 9.0, char: "caregiver_f", cs: "right", chH: 460 },
  { id: "s_auto", type: "desktop", side: "left", dur: 9.0, foot: "rec_control", ss: 7.5, char: "facility_f", cs: "left", chH: 460 },
  { id: "s_app", type: "phone", dur: 9.5, foot: "rec_app", ss: 2.0, char: "caregiver_f", cs: "left", chH: 360 },
  { id: "s_report", type: "desktop", side: "left", dur: 8.5, foot: "rec_report", ss: 8.0, char: "manager_m", cs: "left", chH: 460 },
  { id: "outro", type: "outro", dur: 7.0 },
];

const VENC = `-r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18`;

function renderScene(s) {
  const out = `${SCN}/${s.id}.mp4`;
  if (s.type === "intro" || s.type === "outro") {
    // hero doctor (center-left) + virus (right, shaking) + logo/title
    const isIntro = s.type === "intro";
    const title = `${ROOT}/build/overlays/_${s.id}_txt.png`;
    // build title text png on the fly via node? reuse a prebuilt? -> use drawtext via lavfi is hard for KR. Use overlay png made below.
    const docH = 620, virH = 200;
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]format=yuva420p,scale=-1:${docH},fade=t=in:st=0.2:d=0.6:alpha=1[doc]`,
      `[2:v]format=yuva420p,scale=-1:${virH},fade=t=in:st=0.1:d=0.5:alpha=1[vir]`,
      `[3:v]format=yuva420p,fade=t=in:st=0.6:d=0.7:alpha=1[txt]`,
      `[bg][doc]overlay=x=300:y=H-h-120[b1]`,
      // virus shakes horizontally and bobs
      `[b1][vir]overlay=x=1180+18*sin(2*PI*t/0.5):y=420+12*sin(2*PI*t/0.7)[b2]`,
      `[b2][txt]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -loop 1 -t ${s.dur} -i "${CH}/hero_scene.png" -loop 1 -t ${s.dur} -i "${CH}/virus.png" -loop 1 -t ${s.dur} -i "${title}" -filter_complex "${fc}" -map "[v]" ${VENC} "${out}"`, { stdio: "pipe" });
  } else if (s.type === "desktop") {
    const g = desk(s.side); const ovl = `${OV}/${s.id}.png`;
    const cx = camPos(s.cs, Math.round(s.chH * 0.62));
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${VW}:${VH},setsar=1[foot]`,
      `[3:v]scale=${VW}:${VH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${FW}:${FH}[back]`,
      `[4:v]scale=${FW}:${FH}[front]`,
      `[5:v]${camExpr(s.chH)}`,
      `[6:v]format=yuva420p,fade=t=in:st=0:d=0.5[ov]`,
      `[bg][back]overlay=${g.mX}:${g.mY}[b1]`,
      `[b1][footm]overlay=${g.vx}:${g.vy}[b2]`,
      `[b2][front]overlay=${g.mX}:${g.mY}[b3]`,
      `[b3][ch]overlay=x=${cx}:y=H-h+24+10*sin(2*PI*t/2.6)[b4]`,
      `[b4][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/frame/back.png" -i "${A}/frame/mask.png" -i "${A}/frame/front.png" -loop 1 -t ${s.dur} -i "${CH}/${s.char}.png" -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" ${VENC} "${out}"`, { stdio: "pipe" });
  } else { // phone
    const ovl = `${OV}/${s.id}.png`; const cx = camPos(s.cs, Math.round(s.chH * 0.62));
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${PVW}:${PVH},setsar=1[foot]`,
      `[3:v]scale=${PVW}:${PVH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${PFW}:${PFH}[back]`,
      `[4:v]scale=${PFW}:${PFH}[front]`,
      `[5:v]${camExpr(s.chH)}`,
      `[6:v]format=yuva420p,fade=t=in:st=0:d=0.5[ov]`,
      `[bg][back]overlay=${PMX}:${PMY}[b1]`,
      `[b1][footm]overlay=${PVX}:${PVY}[b2]`,
      `[b2][front]overlay=${PMX}:${PMY}[b3]`,
      `[b3][ch]overlay=x=${cx}:y=H-h+24+10*sin(2*PI*t/2.6)[b4]`,
      `[b4][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/phoneframe/back.png" -i "${A}/phoneframe/mask.png" -i "${A}/phoneframe/front.png" -loop 1 -t ${s.dur} -i "${CH}/${s.char}.png" -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" ${VENC} "${out}"`, { stdio: "pipe" });
  }
  console.log("scene", s.id);
}

for (const s of SCENES) renderScene(s);
console.log("SCENES done");
