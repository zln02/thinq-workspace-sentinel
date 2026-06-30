// xfade concat using REAL probed scene durations (avoids offset drift/truncation).
import { execSync } from "node:child_process";
import { resolve } from "node:path";
const ROOT = resolve(".");
const SCN = `${ROOT}/build/scenes_new`;
const OUT = `${ROOT}/build/PROMO_NEW_silent.mp4`;
const FPS = 30, XF = 0.5;
const IDS = ["intro", "s_dark_alert", "s_white_alert", "s_patient", "s_auto", "s_app", "s_report", "endcard"];
const dur = (f) => parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());
const D = IDS.map((id) => dur(`${SCN}/${id}.mp4`));
const inputs = IDS.map((id) => `-i "${SCN}/${id}.mp4"`).join(" ");
let filt = "", prev = "0:v", R = D[0];
for (let i = 1; i < IDS.length; i++) {
  const off = (R - XF).toFixed(3);
  const lbl = i === IDS.length - 1 ? "vout" : `x${i}`;
  filt += `[${prev}][${i}:v]xfade=transition=fade:duration=${XF}:offset=${off}[${lbl}];`;
  R = R + D[i] - XF; prev = lbl;
}
filt = filt.replace(/;$/, "");
execSync(`ffmpeg -nostdin -y ${inputs} -filter_complex "${filt}" -map "[vout]" -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${OUT}"`, { stdio: "inherit" });
console.log("CONCAT done. total≈", R.toFixed(2) + "s", "durs:", D.map((d) => d.toFixed(2)).join(","));
