// Generates an ORIGINAL warm, minimal ambient track (no copyright) for the promo.
// Chord progression C - G - Am - F (I-V-vi-IV), looped, as gated sine voices
// (pad + bass + soft pluck melody) -> chorus + reverb + lowpass -> build/assets/bgm.wav
// Honest limitation: synthesized from sines; judged by ear by the user.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const FF = "C:/Users/rjwlt/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe";
const OUT = resolve("build/assets/bgm.wav");
const LOOP = 16;      // seconds per progression loop
const TOTAL = 61;     // generate a bit over 60s
const CD = 4;         // chord duration

// note frequencies
const N = { C2:65.41,F2:87.31,G2:98.00,A2:110.00,C3:130.81,F3:174.61,G3:196.00,A3:220.00,
  B3:246.94,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,
  C5:523.25,D5:587.33,E5:659.25,G5:783.99 };

// chord windows within the loop: [startSec, chordNotes..., bass]
// progression: C(0) G(4) Am(8) F(12)
const voices = [];
function addPad(freq, windows, amp){ voices.push({ type:"pad", freq, windows, amp }); }
function addBass(freq, win, amp){ voices.push({ type:"bass", freq, windows:[win], amp }); }
function addPluck(freq, starts, amp){ voices.push({ type:"pluck", freq, windows:starts.map(s=>[s,s+CD]), amp }); }

// pad triads (mid octave) per chord
addPad(N.C4, [[0,4]], 0.10); addPad(N.E4, [[0,4],[8,12]], 0.10); addPad(N.G4, [[0,4]], 0.10);
addPad(N.G3, [[4,8]], 0.10); addPad(N.B3, [[4,8]], 0.10); addPad(N.D4, [[4,8]], 0.10);
addPad(N.A3, [[8,12],[12,16]], 0.10); addPad(N.C4b=N.C4, [[8,12],[12,16]], 0.10); // C in Am & F
addPad(N.F3, [[12,16]], 0.10);
// warm bass roots
addBass(N.C3, [0,4], 0.16); addBass(N.G2, [4,8], 0.16); addBass(N.A2, [8,12], 0.16); addBass(N.F2, [12,16], 0.16);
// gentle bell melody (one soft note per chord)
addPluck(N.G4, [0], 0.09); addPluck(N.D5, [4], 0.09); addPluck(N.E5, [8], 0.09); addPluck(N.C5, [12], 0.09);

// build ffmpeg inputs + per-voice volume expression (loop time lt = mod(t,LOOP))
const inputs = [];
const chains = [];
const labels = [];
voices.forEach((v, i) => {
  inputs.push("-f","lavfi","-i",`sine=frequency=${v.freq.toFixed(2)}:duration=${TOTAL}`);
  // envelope per window
  const envs = v.windows.map(([s,e]) => {
    const lt = "mod(t\\,16)";
    if (v.type === "pluck") {
      // fast attack + exponential decay (bell)
      return `(between(${lt}\\,${s}\\,${s+3.2})*clip((${lt}-${s})/0.03\\,0\\,1)*exp(-(${lt}-${s})*1.5))`;
    }
    const atk = v.type==="bass" ? 0.8 : 0.6;
    const rel = 0.9;
    // trapezoid within [s,e]
    return `(between(${lt}\\,${s}\\,${e})*clip(min(min((${lt}-${s})/${atk}\\,(${e}-${lt})/${rel})\\,1)\\,0\\,1))`;
  });
  // max over windows
  let expr = envs[0];
  for (let k=1;k<envs.length;k++) expr = `max(${expr}\\,${envs[k]})`;
  expr = `${v.amp}*(${expr})`;
  chains.push(`[${i}:a]volume=volume='${expr}':eval=frame[v${i}]`);
  labels.push(`[v${i}]`);
});

const mix = `${labels.join("")}amix=inputs=${voices.length}:normalize=0[mix]`;
const fx = `[mix]chorus=0.5:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,` +
  `aecho=0.8:0.85:350|520:0.35|0.25,` +
  `highpass=f=55,lowpass=f=3200,` +
  `atrim=0:60,asetpts=N/SR/TB,` +
  `afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,` +
  `alimiter=limit=0.92,volume=2.4[out]`;

const filter = [...chains, mix, fx].join(";");
const args = ["-y", ...inputs, "-filter_complex", filter, "-map","[out]", "-ac","2","-ar","44100", OUT];

console.log(`voices=${voices.length}, generating ${OUT} ...`);
execFileSync(FF, args, { stdio: ["ignore","ignore","inherit"] });
console.log("done:", OUT);
