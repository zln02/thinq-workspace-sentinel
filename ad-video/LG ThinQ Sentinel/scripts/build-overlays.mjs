// Text overlays v3 — feature-focused copy (no sim hedges, no endcard), CO2 subscript fixed.
import CanvasKitInit from "canvaskit-wasm/full";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");
const OUT = resolve(ROOT, "build/overlays");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");
const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
await mkdir(OUT, { recursive: true });

const W = 1920, H = 1080;
const GREEN = "#0A6555", CHAR = "#2C2823", MUTED = "#7A7066";
const c4 = (h, a = 1) => { const s = h.replace("#", ""); return ck.Color4f(parseInt(s.slice(0,2),16)/255, parseInt(s.slice(2,4),16)/255, parseInt(s.slice(4,6),16)/255, a); };
const T = (o) => renderText(ck, o);
const FW = 1160, FH = 758, MYr = 161;

// inline run with subscript support → tight PNG. segs: [{t},{t,sub:true}]
async function runPNG(segs, { size = 23, color = GREEN } = {}) {
  const imgs = [];
  for (const s of segs) { const sz = s.sub ? Math.round(size * 0.62) : size; const r = await T({ text: s.t, fontPath: F_SEMI, size: sz, color, letter: 0.2, pad: 1 }); imgs.push({ img: ck.MakeImageFromEncoded(r.buffer), w: r.width, h: r.height, sub: !!s.sub }); }
  const maxH = Math.max(...imgs.map(i => i.h)); const totW = imgs.reduce((a, i) => a + i.w, 0) + 4; const totH = maxH + 4;
  const sf = ck.MakeSurface(totW, totH), cv = sf.getCanvas(); cv.clear(ck.TRANSPARENT); const ip = new ck.Paint(); ip.setAntiAlias(true); let x = 2;
  for (const i of imgs) { const y = i.sub ? 2 + (maxH - i.h) + Math.round(maxH * 0.12) : 2 + Math.round((maxH - i.h) / 2); cv.drawImageRect(i.img, ck.LTRBRect(0, 0, i.w, i.h), ck.LTRBRect(x, y, x + i.w, y + i.h), ip); x += i.w; }
  sf.flush(); const buf = Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return { buf, w: totW, h: totH };
}

async function pill(textOrSegs, { size = 23, fg = GREEN, dot = false, padX = 20, padY = 11 } = {}) {
  const inner = Array.isArray(textOrSegs) ? await runPNG(textOrSegs, { size, color: fg }) : await (async () => { const r = await T({ text: textOrSegs, fontPath: F_SEMI, size, color: fg, letter: 0.2, pad: 1 }); return { buf: r.buffer, w: r.width, h: r.height }; })();
  const dotW = dot ? 26 : 0, pw = inner.w + padX * 2 + dotW, ph = inner.h + padY * 2;
  const sf = ck.MakeSurface(pw, ph), cv = sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const rr = ck.RRectXY(ck.LTRBRect(0, 0, pw, ph), ph / 2, ph / 2); const fp = new ck.Paint(); fp.setColor(c4(fg, 0.10)); cv.drawRRect(rr, fp);
  let tx = padX; if (dot) { const dp = new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(padX + 5, ph / 2, 6, dp); tx = padX + dotW; }
  const ti = ck.MakeImageFromEncoded(inner.buf); const ip = new ck.Paint(); ip.setAntiAlias(true); cv.drawImageRect(ti, ck.LTRBRect(0, 0, inner.w, inner.h), ck.LTRBRect(tx, padY, tx + inner.w, padY + inner.h), ip);
  sf.flush(); const buf = Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return { buf, w: pw, h: ph };
}

function blit(cv, buf, x, y, w, h) { const img = ck.MakeImageFromEncoded(buf); const ip = new ck.Paint(); ip.setAntiAlias(true); cv.drawImageRect(img, ck.LTRBRect(0, 0, w, h), ck.LTRBRect(x, y, x + w, y + h), ip); }

async function overlay(spec) {
  const { id, idx, kicker, titleLines, caption, chips = [], side = "right", center = false, textW = 820 } = spec;
  const sf = ck.MakeSurface(W, H), cv = sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  if (center) {
    const parts = [];
    if (kicker) parts.push({ ...(await pill(kicker, { dot: true })), gap: 22 });
    for (const tl of titleLines) { const r = await T({ text: tl.text, fontPath: F_BOLD, size: tl.size ?? 80, color: tl.green ? GREEN : CHAR, letter: -1.4, pad: 4 }); parts.push({ buf: r.buffer, w: r.width, h: r.height, gap: 6 }); }
    if (caption) { const r = await T({ text: caption, fontPath: F_SEMI, size: 30, color: MUTED, line: 1.55, align: "center", pad: 4 }); parts.push({ buf: r.buffer, w: r.width, h: r.height, gap: 30 }); }
    const totH = parts.reduce((a, p) => a + p.h + (p.gap ?? 18), 0); let y = Math.round((H - totH) / 2);
    for (const p of parts) { blit(cv, p.buf, Math.round((W - p.w) / 2), y, p.w, p.h); y += p.h + (p.gap ?? 18); }
  } else {
    const mX = side === "right" ? (W - FW - 72) : 72;
    const tx = side === "right" ? 96 : (mX + FW + 44);
    const k = await pill(`${idx} · ${kicker}`, { dot: true, size: 26 }); blit(cv, k.buf, tx, 274, k.w, k.h);
    let ty = 352;
    for (const tl of titleLines) { const r = await T({ text: tl.text, fontPath: F_BOLD, size: 72, color: tl.green ? GREEN : CHAR, letter: -1.6, pad: 4 }); blit(cv, r.buffer, tx - 4, ty, r.width, r.height); ty += r.height - 10; }
    { const r = await T({ text: caption, fontPath: F_SEMI, size: 31, color: MUTED, line: 1.5, pad: 4 }); blit(cv, r.buffer, tx, ty + 26, r.width, r.height); ty += r.height + 26; }
    let px = tx, py = ty + 38;
    for (const ch of chips) { const cp = await pill(ch, { size: 24 }); blit(cv, cp.buf, px, py, cp.w, cp.h); px += cp.w + 12; if (px > tx + textW) { px = tx; py += cp.h + 12; } }
  }
  sf.flush(); await writeFile(join(OUT, `${id}.png`), Buffer.from(sf.makeImageSnapshot().encodeToBytes())); sf.delete(); console.log("overlay", id);
}

// ===== scenes (feature-focused, character-driven) =====
await overlay({ id: "s_epidemic", idx: "01", kicker: "감염병 조기경보", side: "right",
  titleLines: [{ text: "감염병 유행을" }, { text: "먼저 포착합니다", green: true }],
  caption: "약국 OTC 판매 · 하수 바이러스 · 검색 추이 —\n3가지 신호를 종합해 지역 유행을 조기 감지합니다.",
  chips: ["약국 OTC", "하수 RNA", "검색 추이"] });

await overlay({ id: "s_nurse", idx: "02", kicker: "현장 즉시 공유", side: "left",
  titleLines: [{ text: "경보가 곧바로" }, { text: "간호사 화면에", green: true }],
  caption: "유행 신호가 잡히면 현장 간호사 화면에\n즉시 공유, 조치 가이드까지 함께.",
  chips: ["실시간 경보", "조치 가이드", "역할별 화면"] });

await overlay({ id: "s_patient", idx: "03", kicker: "실시간 관제", side: "right",
  titleLines: [{ text: "병실 환경과" }, { text: "환자 상태를 한눈에", green: true }],
  caption: "공기질·온습도·재실 인원까지\n병동 전체를 실시간으로 관제합니다.",
  chips: [[{ t: "CO" }, { t: "2", sub: true }, { t: " 농도" }], "온·습도", "재실 인원"] });

await overlay({ id: "s_auto", idx: "04", kicker: "ThinQ 자동 방역", side: "left",
  titleLines: [{ text: "위험을 감지하면" }, { text: "가전이 자동 대응", green: true }],
  caption: "공기청정·환기·제습·살균까지\n위험도에 맞춰 스스로 작동합니다.",
  chips: ["공기청정", "환기·제습", "위험도 비례"] });

await overlay({ id: "s_app", idx: "05", kicker: "보호자 안심 케어", side: "right", textW: 560,
  titleLines: [{ text: "보호자도" }, { text: "실시간으로 안심", green: true }],
  caption: "지금 병원이 무엇을 하는지\n앱에서 투명하게 확인합니다.",
  chips: ["가족 안심", "병동 현황", "24시간 알림"] });

await overlay({ id: "s_report", idx: "06", kicker: "경영 성과 리포트", side: "left",
  titleLines: [{ text: "성과는" }, { text: "리포트로 자동 정리", green: true }],
  caption: "감염 관리 활동·비용·법규 준수를\n데이터로 자동 집계합니다.",
  chips: ["활동 집계", "비용 현황", "법규 준수"] });

console.log("DONE overlays v3");
