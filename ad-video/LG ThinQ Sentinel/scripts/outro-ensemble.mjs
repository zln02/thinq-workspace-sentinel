// Ensemble finale outro: all characters in a row, waving, happy + logo.
import { execSync } from "node:child_process";
import { resolve } from "node:path";
const ROOT=resolve("."); const KEY=`${ROOT}/veo/keyed`; const BG=`${ROOT}/build/promo2/bg.png`;
const OV=`${ROOT}/build/overlays`; const OUT=`${ROOT}/build/scenes_v4/outro.mp4`;
const W=1920,H=1080,FPS=30,DUR=7.5,chH=460,cw=Math.round(chH*540/720);
// order across the row (doctor waving center-ish)
const chars=["s_nurse","s_patient","outro","s_auto","s_report","s_app"]; // outro.mov = doctor wave
const n=chars.length;
const gap=(W - n*cw)/(n+1);
const xs=chars.map((_,i)=>Math.round(gap+i*(cw+gap)));
const y=H-chH-24;
const inputs=[`-loop 1 -t ${DUR} -i "${BG}"`, ...chars.map(c=>`-stream_loop -1 -i "${KEY}/${c}.mov"`), `-loop 1 -t ${DUR} -i "${OV}/_outro_txt.png"`].join(" ");
let fc=[`[0:v]scale=${W}:${H}[bg]`];
chars.forEach((c,i)=>{ fc.push(`[${i+1}:v]crop=540:720:370:0,scale=-1:${chH},format=yuva420p,fade=t=in:st=${0.2+i*0.12}:d=0.5:alpha=1[c${i}]`); });
let prev="bg";
chars.forEach((c,i)=>{ const lbl=`o${i}`; fc.push(`[${prev}][c${i}]overlay=x=${xs[i]}:y=${y}[${lbl}]`); prev=lbl; });
fc.push(`[${prev}][${n+1}:v]format=yuva420p,fade=t=in:st=0.6:d=0.7[txt0];[txt0]null[txtdummy]`); // placeholder
// simpler: overlay logo last
fc.pop();
fc.push(`[${n+1}:v]format=yuva420p,fade=t=in:st=0.6:d=0.7[txt]`);
fc.push(`[${prev}][txt]overlay=0:0,format=yuv420p[v]`);
execSync(`ffmpeg -nostdin -y ${inputs} -filter_complex "${fc.join(";")}" -map "[v]" -t ${DUR} -r ${FPS} -pix_fmt yuv420p -c:v libx264 -crf 18 "${OUT}"`,{stdio:"pipe"});
console.log("ensemble outro done", DUR+"s", "xs=",xs.join(","));
