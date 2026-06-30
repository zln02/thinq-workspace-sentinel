// Animated WARM hero (v3 layout): brand lockup pops in -> kicker -> headline
// rise -> dashboard floats in -> infographic chip pops -> 83.6% counts up.
// Renders bg + foreground PNGs + a Lottie scene. Output: build/hero/*
import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";
import * as L from "./lottie-lib.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");
const OUT = resolve(ROOT, "build/hero");
const ASSETS = join(OUT, "assets");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");
const CREAM_T="#FCF7EF", CREAM_B="#F1E7D6", GLOW="#FFE9CC";
const GREEN="#0A6555", CHAR="#2C2823", MUTED="#7A7066";

const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const W=1920,H=1080,OP=420;
await mkdir(ASSETS,{recursive:true});
const c4=(h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};

// ---------- warm background PNG ----------
{
  const sf=ck.MakeSurface(W,H),cv=sf.getCanvas();
  let p=new ck.Paint(); p.setShader(ck.Shader.MakeLinearGradient([0,0],[0,H],[c4(CREAM_T),c4(CREAM_B)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([520,300],820,[c4(GLOW,0.85),c4(GLOW,0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([1420,560],720,[c4("#FFF3E0",0.75),c4("#FFF3E0",0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([W/2,H/2],1180,[c4("#000000",0),c4("#5A4327",0.09)],[0.62,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  sf.flush(); await writeFile(join(OUT,"bg_warm.png"), Buffer.from(sf.makeImageSnapshot().encodeToBytes())); sf.delete();
}

const T=(o)=>renderText(ck,o);
async function save(file,buf){ await writeFile(join(ASSETS,file),buf); }

// ---------- layout (mirrors build-hero.mjs v3) ----------
const LX=132;
const mockBuf = await readFile(resolve(ROOT,"build/assets/mockup_kwanje.png"));
const mImg = ck.MakeImageFromEncoded(mockBuf);
const mScale=0.70, ow=mImg.width(), oh=mImg.height();
const mW=ow*mScale, mH=oh*mScale, mX=W-mW+34, mY=(H-mH)/2;
await save("mockup.png", mockBuf);

const logoBuf = await readFile(resolve(ROOT,"build/assets/logomark.png"));
await save("logo.png", logoBuf);
const lSize=190, lY=118, nameX=LX+lSize+30;

const lg  = await T({ text:"LG ThinQ", fontPath:F_SEMI, size:34, color:"#5A5048", letter:0.5, pad:2 }); await save("lg.png",lg.buffer);
const nm  = await T({ text:"Space Sentinel", fontPath:F_BOLD, size:64, color:GREEN, letter:-1.5, pad:2 }); await save("nm.png",nm.buffer);
// vertically center the name block against the (now larger) logo
const nameH = lg.height + nm.height - 8;
const nameTop = lY + (lSize - nameH)/2;
const h1  = await T({ text:"감염병, 터지기 전에", fontPath:F_BOLD, size:78, color:CHAR, letter:-1.5, pad:4 }); await save("h1.png",h1.buffer);
const h2  = await T({ text:"막습니다", fontPath:F_BOLD, size:78, color:GREEN, letter:-1.5, pad:4 }); await save("h2.png",h2.buffer);
const sub = await T({ text:"요양병원의 공기와 환경을 24시간 지켜보고,\n위험을 미리 감지해 자동으로 막아냅니다.", fontPath:F_SEMI, size:28, color:MUTED, line:1.5, pad:4 }); await save("sub.png",sub.buffer);

// kicker pill PNG
let kicker;
{
  const txt=await T({ text:"AI 감염 예방 · 자동 방역 관제 시스템", fontPath:F_SEMI, size:24, color:GREEN, letter:0.3, pad:2 });
  const padX=20,padY=12,pw=txt.width+padX*2,ph=txt.height+padY*2;
  const sf=ck.MakeSurface(pw,ph),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const rr=ck.RRectXY(ck.LTRBRect(0,0,pw,ph),ph/2,ph/2); const fp=new ck.Paint(); fp.setColor(c4(GREEN,0.10)); cv.drawRRect(rr,fp);
  const ti=ck.MakeImageFromEncoded(txt.buffer); const ip=new ck.Paint(); ip.setAntiAlias(true);
  cv.drawImageRect(ti,ck.LTRBRect(0,0,txt.width,txt.height),ck.LTRBRect(padX,padY,padX+txt.width,padY+txt.height),ip);
  sf.flush(); await save("kicker.png",Buffer.from(sf.makeImageSnapshot().encodeToBytes())); kicker={w:pw,h:ph}; sf.delete();
}

// positions (top-left)
const POS = {
  logo:{file:"logo.png", w:lSize, h:lSize, x:LX, y:lY, native:512},
  lg:{file:"lg.png", w:lg.width, h:lg.height, x:nameX, y:nameTop},
  nm:{file:"nm.png", w:nm.width, h:nm.height, x:nameX-2, y:nameTop+lg.height-6},
  kicker:{file:"kicker.png", w:kicker.w, h:kicker.h, x:LX, y:322},
  h1:{file:"h1.png", w:h1.width, h:h1.height, x:LX-4, y:408},
  h2:{file:"h2.png", w:h2.width, h:h2.height, x:LX-4, y:408+h1.height-10},
  sub:{file:"sub.png", w:sub.width, h:sub.height, x:LX, y:408+h1.height*2+24},
};

// (intro no longer shows the 83.6% chip / count-up — moved to the 성과 scene only)

// ---------- assemble Lottie ----------
const assets=[], layers=[];
function img(id, P, ks){ assets.push(L.imageAsset({id, w:P.w, h:P.h, file:P.file})); layers.push(L.imageLayer({id, refId:id, w:P.w, h:P.h, op:OP, ks})); }
const entrance=({P, fadeIn, rise=0, scaleFrom=null, baseScale=100})=>{
  const cx=P.x+P.w/2, cy=P.y+P.h/2;
  return L.transform({
    a:[P.w/2,P.h/2,0],
    p: rise ? L.animated([[fadeIn[0],[cx,cy+rise,0],"out"],[fadeIn[1]+4,[cx,cy,0]]]) : [cx,cy,0],
    o: L.fade({inA:fadeIn[0],inB:fadeIn[1]}),
    s: scaleFrom!=null ? L.animated([[fadeIn[0],[baseScale*scaleFrom,baseScale*scaleFrom,100],"out"],[fadeIn[1]+4,[baseScale,baseScale,100]]]) : [baseScale,baseScale,100],
  });
};

// mockup (native size, scaled at layer)
{
  const cx=mX+mW/2, cy=mY+mH/2, base=mScale*100;
  const ks=L.transform({ a:[ow/2,oh/2,0],
    p:L.animated([[30,[cx,cy+18,0],"out"],[78,[cx,cy,0]]]),
    o:L.fade({inA:30,inB:76}),
    s:L.animated([[30,[base*0.965,base*0.965,100],"out"],[78,[base,base,100]]]) });
  assets.push(L.imageAsset({id:"mockup",w:ow,h:oh,file:"mockup.png"}));
  layers.push(L.imageLayer({id:"mockup",refId:"mockup",w:ow,h:oh,op:OP,ks}));
}

// logo lockup
img("logo", POS.logo, entrance({P:POS.logo, fadeIn:[4,30], scaleFrom:0.8, baseScale:lSize/POS.logo.native*100}));
img("lg",   POS.lg,   entrance({P:POS.lg,   fadeIn:[16,36], rise:10}));
img("nm",   POS.nm,   entrance({P:POS.nm,   fadeIn:[22,46], rise:14}));
img("kicker",POS.kicker,entrance({P:POS.kicker, fadeIn:[44,64], rise:10}));
img("h1",   POS.h1,   entrance({P:POS.h1,   fadeIn:[52,80], rise:20}));
img("h2",   POS.h2,   entrance({P:POS.h2,   fadeIn:[64,92], rise:20}));
img("sub",  POS.sub,  entrance({P:POS.sub,  fadeIn:[84,108], rise:8}));

// Lottie draws array index 0 on TOP. We pushed bottom->top, so reverse to top-first.
layers.reverse();
await writeFile(join(OUT,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:"Warm Hero Animated",assets,layers})));
console.log(`hero-anim v3 -> ${OUT} | layers=${layers.length} h1w=${h1.width}`);
