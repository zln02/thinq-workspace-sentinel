// v4 assembler — Veo character CLIPS (alpha MOV) instead of static cutouts.
// Feature scenes: bg + browser/phone frame + dashboard footage + KEYED character clip + text overlay.
// Title scenes (intro/outro): keyed character clip (doctor vs virus / wave) + logo overlay.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const REC = "/home/ubuntu/.claude/jobs/d186bb64/tmp";
const A = `${ROOT}/build/assets`;
const KEY = `${ROOT}/veo/keyed`;
const BG = `${ROOT}/build/promo2/bg.png`;
const OV = `${ROOT}/build/overlays`;
const SCN = `${ROOT}/build/scenes_v4`;
const FPS = 30, W = 1920, H = 1080;
rmSync(SCN, { recursive: true, force: true }); mkdirSync(SCN, { recursive: true });
const foot = (d) => execSync(`ls ${REC}/${d}/*.webm`).toString().trim().split("\n")[0];

const FW = 1160, FH = 758, MYr = 161, SOX = 85, SOY = 116, VW = 990, VH = 556;
const desk = (side) => { const mX = side === "right" ? (W - FW - 72) : 72; return { mX, mY: MYr, vx: mX + SOX, vy: MYr + SOY }; };
const PFW = 581, PFH = 1067, PMX = 1190, PMY = 7, PVX = PMX + 113, PVY = 119, PVW = 354, PVH = 840;

// character clip placement: crop central region of the 1280x720 keyed clip, scale to chH, place bottom on `cs` side.
// cropW = central width to keep (character is roughly centered). chH = target character display height.
const SCENES = [
  { id: "intro", type: "hero", dur: 7.0, clip: "intro", title: "_intro_txt", heroH: 600 },
  { id: "s_epidemic", type: "desktop", side: "right", dur: 8.0, foot: "rec_epidemic", ss: 3.0, clip: "s_epidemic", cs: "right", cropW: 700, chH: 510 },
  { id: "s_nurse", type: "desktop", side: "left", dur: 8.0, foot: "rec_nurse", ss: 9.0, clip: "s_nurse", cs: "left", cropW: 700, chH: 510 },
  { id: "s_patient", type: "desktop", side: "right", dur: 8.0, foot: "rec_patient", ss: 9.0, clip: "s_patient", cs: "right", cropW: 640, chH: 480 },
  { id: "s_auto", type: "desktop", side: "left", dur: 8.0, foot: "rec_control3", ss: 2.0, clip: "s_auto", cs: "left", cropW: 700, chH: 510 },
  { id: "s_app", type: "phone", dur: 8.0, foot: "rec_app2", ss: 1.0, clip: "s_app", cs: "left", cropW: 640, chH: 560 },
  { id: "s_report", type: "desktop", side: "left", dur: 8.0, foot: "rec_report", ss: 8.0, clip: "s_report", cs: "left", cropW: 700, chH: 510 },
  { id: "outro", type: "hero", dur: 7.5, clip: "outro_group", title: "_outro_txt", heroH: 600 },
];

const VENC = `-r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18`;
const clipIn = (name) => `-stream_loop -1 -i "${KEY}/${name}.mov"`;
// crop expr for central character column from 1280x720
const camCrop = (cropW) => `crop=${cropW}:720:${Math.round((1280 - cropW) / 2)}:0`;

function renderScene(s) {
  const out = `${SCN}/${s.id}.mp4`;
  if (s.type === "hero") {
    // keyed character clip + logo overlay (+ virus element for intro)
    if (s.virus) {
      const fc = [
        `[0:v]scale=${W}:${H}[bg]`,
        `[1:v]scale=-1:${s.heroH},format=yuva420p[ch]`,
        `[3:v]scale=-1:200,format=yuva420p[vir]`,
        `[2:v]format=yuva420p,fade=t=in:st=0.2:d=0.5:alpha=1[txt]`,
        `[bg][ch]overlay=x=(W-w)/2:y=H-h[b1]`,
        `[b1][vir]overlay=x=W/2-430+8*sin(2*PI*t/0.5):y=420+14*sin(2*PI*t/0.6)[b2]`,
        `[b2][txt]overlay=0:0,format=yuv420p[v]`,
      ].join(";");
      execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" ${clipIn(s.clip)} -loop 1 -t ${s.dur} -i "${OV}/${s.title}.png" -loop 1 -t ${s.dur} -i "${ROOT}/assets/chars/virus.png" -filter_complex "${fc}" -map "[v]" -t ${s.dur} ${VENC} "${out}"`, { stdio: "pipe" });
    } else {
      const fc = [
        `[0:v]scale=${W}:${H}[bg]`,
        `[1:v]scale=-1:${s.heroH},format=yuva420p[ch]`,
        `[2:v]format=yuva420p,fade=t=in:st=0.2:d=0.5:alpha=1[txt]`,
        `[bg][ch]overlay=x=(W-w)/2:y=H-h[b1]`,
        `[b1][txt]overlay=0:0,format=yuv420p[v]`,
      ].join(";");
      execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" ${clipIn(s.clip)} -loop 1 -t ${s.dur} -i "${OV}/${s.title}.png" -filter_complex "${fc}" -map "[v]" -t ${s.dur} ${VENC} "${out}"`, { stdio: "pipe" });
    }
  } else if (s.type === "desktop") {
    const g = desk(s.side); const ovl = `${OV}/${s.id}.png`;
    const cw = Math.round(s.chH * s.cropW / 720);          // displayed char width
    const cx = s.cs === "left" ? 8 : (W - cw - 8);          // fully visible at outer edge
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${VW}:${VH},setsar=1[foot]`,
      `[3:v]scale=${VW}:${VH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${FW}:${FH}[back]`,
      `[4:v]scale=${FW}:${FH}[front]`,
      `[5:v]${camCrop(s.cropW)},scale=-1:${s.chH},format=yuva420p[ch]`,
      `[6:v]format=yuva420p,fade=t=in:st=0:d=0.5:alpha=1[ov]`,
      `[bg][back]overlay=${g.mX}:${g.mY}[b1]`,
      `[b1][footm]overlay=${g.vx}:${g.vy}[b2]`,
      `[b2][front]overlay=${g.mX}:${g.mY}[b3]`,
      `[b3][ch]overlay=x=${cx}:y=H-h-6[b4]`,
      `[b4][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/frame/back.png" -i "${A}/frame/mask.png" -i "${A}/frame/front.png" ${clipIn(s.clip)} -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" -t ${s.dur} ${VENC} "${out}"`, { stdio: "pipe" });
  } else { // phone
    const ovl = `${OV}/${s.id}.png`;
    const cw = Math.round(s.chH * s.cropW / 720); const cx = 620;
    const fc = [
      `[0:v]scale=${W}:${H}[bg]`,
      `[1:v]scale=${PVW}:${PVH},setsar=1[foot]`,
      `[3:v]scale=${PVW}:${PVH},format=gray[m]`,
      `[foot][m]alphamerge[footm]`,
      `[2:v]scale=${PFW}:${PFH}[back]`,
      `[4:v]scale=${PFW}:${PFH}[front]`,
      `[5:v]${camCrop(s.cropW)},scale=-1:${s.chH},format=yuva420p[ch]`,
      `[6:v]format=yuva420p,fade=t=in:st=0:d=0.5:alpha=1[ov]`,
      `[bg][back]overlay=${PMX}:${PMY}[b1]`,
      `[b1][footm]overlay=${PVX}:${PVY}[b2]`,
      `[b2][front]overlay=${PMX}:${PMY}[b3]`,
      `[b3][ch]overlay=x=${cx}:y=H-h-6[b4]`,
      `[b4][ov]overlay=0:0,format=yuv420p[v]`,
    ].join(";");
    execSync(`ffmpeg -nostdin -y -loop 1 -t ${s.dur} -i "${BG}" -ss ${s.ss} -t ${s.dur} -i "${foot(s.foot)}" -i "${A}/phoneframe/back.png" -i "${A}/phoneframe/mask.png" -i "${A}/phoneframe/front.png" ${clipIn(s.clip)} -loop 1 -t ${s.dur} -i "${ovl}" -filter_complex "${fc}" -map "[v]" -t ${s.dur} ${VENC} "${out}"`, { stdio: "pipe" });
  }
  console.log("scene", s.id);
}
for (const s of SCENES) { if (!existsSync(`${KEY}/${s.clip}.mov`)) { console.log("SKIP (no clip)", s.id); continue; } renderScene(s); }
console.log("SCENES v4 done");
