// WARM premium hero key-visual v3: brand lockup (logo + name) prominent,
// clean left text-zone / right dashboard-zone split (no overlaps), infographic
// chip. CanvasKit only -> build/hero_warm.png
import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");

const CREAM_T="#FCF7EF", CREAM_B="#F1E7D6", GLOW="#FFE9CC";
const GREEN="#0A6555", CHAR="#2C2823", MUTED="#7A7066", SUBMUTED="#9A8C7C";

const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const W=1920,H=1080;
const surface = ck.MakeSurface(W,H); const cv = surface.getCanvas();
const c4=(h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};

// background
let p=new ck.Paint(); p.setShader(ck.Shader.MakeLinearGradient([0,0],[0,H],[c4(CREAM_T),c4(CREAM_B)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([520,300],820,[c4(GLOW,0.85),c4(GLOW,0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([1420,560],720,[c4("#FFF3E0",0.75),c4("#FFF3E0",0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([W/2,H/2],1180,[c4("#000000",0),c4("#5A4327",0.09)],[0.62,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);

function drawImg(buf,x,y,scale=1){const img=ck.MakeImageFromEncoded(buf);const iw=img.width(),ih=img.height();const pp=new ck.Paint();pp.setAntiAlias(true);cv.drawImageRect(img,ck.LTRBRect(0,0,iw,ih),ck.LTRBRect(x,y,x+iw*scale,y+ih*scale),pp);return{w:iw*scale,h:ih*scale};}
const T=(o)=>renderText(ck,o);

// ---- right: dashboard mockup (zone x>=900) ----
const mockBuf = await readFile(resolve(ROOT,"build/assets/mockup_kwanje.png"));
const mImg = ck.MakeImageFromEncoded(mockBuf);
const mScale = 0.70;
const mW=mImg.width()*mScale, mH=mImg.height()*mScale;
const mX = W - mW + 34, mY = (H-mH)/2;
drawImg(mockBuf, mX, mY, mScale);

// ---- left zone ----
const LX = 132;

// brand lockup: logo + name (prominent)
const logoBuf = await readFile(resolve(ROOT,"build/assets/logomark.png"));
const lSize = 104, lY = 150;
drawImg(logoBuf, LX, lY, lSize/512);
const nameX = LX + lSize + 26;
const lgline = await T({ text:"LG ThinQ", fontPath:F_SEMI, size:28, color:MUTED, letter:0.5, pad:2 });
drawImg(lgline.buffer, nameX, lY+8);
const nm = await T({ text:"Space Sentinel", fontPath:F_BOLD, size:50, color:CHAR, letter:-1, pad:2 });
drawImg(nm.buffer, nameX-2, lY+8+lgline.height-2);

// kicker pill
{
  const k = await T({ text:"AI 감염 예방 · 자동 방역 관제 시스템", fontPath:F_SEMI, size:24, color:GREEN, letter:0.3, pad:2 });
  const px=LX, py=322, padX=20, padY=12, pw=k.width+padX*2, ph=k.height+padY*2;
  const rr=ck.RRectXY(ck.LTRBRect(px,py,px+pw,py+ph),ph/2,ph/2);
  const fp=new ck.Paint(); fp.setColor(c4(GREEN,0.10)); cv.drawRRect(rr,fp);
  drawImg(k.buffer, px+padX, py+padY);
}

// headline (sized to fit left zone, ends < mX)
const h1 = await T({ text:"감염병, 터지기 전에", fontPath:F_BOLD, size:78, color:CHAR, letter:-1.5, pad:4 });
drawImg(h1.buffer, LX-4, 408);
const h2 = await T({ text:"막습니다", fontPath:F_BOLD, size:78, color:GREEN, letter:-1.5, pad:4 });
drawImg(h2.buffer, LX-4, 408 + h1.height - 10);

// subcopy
const sub = await T({ text:"요양병원의 공기와 환경을 24시간 지켜보고,\n위험을 미리 감지해 자동으로 막아냅니다.", fontPath:F_SEMI, size:28, color:MUTED, line:1.5, pad:4 });
drawImg(sub.buffer, LX, 408 + h1.height*2 + 24);

console.error(`h1 width=${h1.width} ends at ${LX+h1.width} (mockup starts ${Math.round(mX)})`);

// ---- infographic chip on mockup ----
{
  const cardX=mX+54, cardY=mY+mH-200, cw=312, chh=140, r=24;
  const rr=ck.RRectXY(ck.LTRBRect(cardX,cardY,cardX+cw,cardY+chh),r,r);
  const sp=new ck.Paint(); sp.setColor(c4("#7A5A3A",0.26)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,24,true));
  cv.save(); cv.translate(0,12); cv.drawRRect(rr,sp); cv.restore();
  const cp=new ck.Paint(); cp.setColor(c4("#FFFFFF",0.97)); cv.drawRRect(rr,cp);
  const bp=new ck.Paint(); bp.setStyle(ck.PaintStyle.Stroke); bp.setStrokeWidth(2); bp.setColor(c4(GREEN,0.12)); cv.drawRRect(rr,bp);
  const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(cardX+32,cardY+42,7,dp);
  const lbl=await T({ text:"감염 완화 효과", fontPath:F_SEMI, size:24, color:MUTED, pad:2 });
  drawImg(lbl.buffer, cardX+50, cardY+28);
  const val=await T({ text:"83.6%", fontPath:F_BOLD, size:60, color:GREEN, pad:2 });
  drawImg(val.buffer, cardX+28, cardY+62);
}

surface.flush();
await writeFile(resolve(ROOT,"build/hero_warm.png"), Buffer.from(surface.makeImageSnapshot().encodeToBytes()));
console.log("hero v3 -> build/hero_warm.png");
