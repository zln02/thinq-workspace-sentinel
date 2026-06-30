// Generates a logomark for "LG ThinQ Space Sentinel":
//   squircle app-icon tile (warm green gradient) + white shield (protection)
//   + green sensing pulse (dot + arc). Output: build/assets/logomark.png (512)
// Concept: a guardian (Sentinel) that senses and protects a space.
import CanvasKitInit from "canvaskit-wasm/full";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const c4 = (h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};

const S = 512;
const surface = ck.MakeSurface(S, S);
const cv = surface.getCanvas();
cv.clear(ck.TRANSPARENT);

// --- squircle tile --- (tight padding so the mark fills its box; less empty space)
const pad = 16, r = 150;
const tile = ck.LTRBRect(pad, pad, S-pad, S-pad);
const rr = ck.RRectXY(tile, r, r);

// green gradient fill
const gp = new ck.Paint();
gp.setShader(ck.Shader.MakeLinearGradient([pad,pad],[S-pad,S-pad],[c4("#15917A"),c4("#085344")],[0,1],ck.TileMode.Clamp));
cv.drawRRect(rr, gp);
// top inner highlight
const hp = new ck.Paint();
hp.setShader(ck.Shader.MakeRadialGradient([S/2,pad+40],300,[c4("#FFFFFF",0.18),c4("#FFFFFF",0)],[0,1],ck.TileMode.Clamp));
cv.save(); cv.clipRRect(rr, ck.ClipOp.Intersect, true); cv.drawRRect(rr, hp); cv.restore();

// --- virus mark (centered), matching the dashboard's green-squircle + white virus ---
const vx = S/2, vy = S/2;
const body = 74;        // central body radius (scaled up to fill the tighter squircle)
const stalk = 32;       // spike stalk length
const knob = 14;        // spike knob radius
const N = 12;           // number of spikes

const white = c4("#FFFFFF", 0.97);

// faint outer sensing ring (keeps the "detection" meaning, very subtle)
{
  const ring = new ck.Paint(); ring.setAntiAlias(true); ring.setStyle(ck.PaintStyle.Stroke);
  ring.setStrokeWidth(5); ring.setColor(c4("#FFFFFF", 0.16));
  cv.drawCircle(vx, vy, body + stalk + knob + 20, ring);
}

// spikes (stalk + knob), radiating
{
  const sp = new ck.Paint(); sp.setAntiAlias(true); sp.setStyle(ck.PaintStyle.Stroke);
  sp.setStrokeWidth(16); sp.setStrokeCap(ck.StrokeCap.Round); sp.setColor(white);
  const kp = new ck.Paint(); kp.setAntiAlias(true); kp.setColor(white);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const ix = vx + Math.cos(a) * (body - 4), iy = vy + Math.sin(a) * (body - 4);
    const ox = vx + Math.cos(a) * (body + stalk), oy = vy + Math.sin(a) * (body + stalk);
    cv.drawLine(ix, iy, ox, oy, sp);
    cv.drawCircle(vx + Math.cos(a) * (body + stalk + knob - 2), vy + Math.sin(a) * (body + stalk + knob - 2), knob, kp);
  }
}

// body
{
  const bp = new ck.Paint(); bp.setAntiAlias(true); bp.setColor(white);
  cv.drawCircle(vx, vy, body, bp);
  // inner "germ" dots (green, like the reference texture)
  const gp = new ck.Paint(); gp.setAntiAlias(true); gp.setColor(c4("#0A6555", 0.85));
  const dots = [[-22,-12,13],[20,-17,10],[8,20,12],[-12,22,8],[27,10,7]];
  for (const [dx,dy,r2] of dots) cv.drawCircle(vx+dx, vy+dy, r2, gp);
}

surface.flush();
await mkdir(resolve("build/assets"), { recursive: true });
await writeFile(resolve("build/assets/logomark.png"), Buffer.from(surface.makeImageSnapshot().encodeToBytes()));
console.log("logomark -> build/assets/logomark.png");
