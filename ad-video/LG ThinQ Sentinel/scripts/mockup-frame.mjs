// Produces a REUSABLE browser-window frame (chrome only, transparent screen)
// so a live video can play inside it. Outputs to build/assets/frame/:
//   back.png  - drop shadow + white rounded body (sits BEHIND the video)
//   front.png - title bar + traffic dots + 1px border (sits IN FRONT, screen transparent)
//   mask.png  - screen-sized alpha (square top, rounded bottom) to round the video
//   meta.json - { frameW, frameH, screenX, screenY, screenW, screenH }
import CanvasKitInit from "canvaskit-wasm/full";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const c4=(h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};

const screenW=1280, screenH=720, barH=40, R=22, PAD=110;
const frameW=screenW+PAD*2, frameH=barH+screenH+PAD*2;
const bodyL=PAD, bodyT=PAD, bodyR=PAD+screenW, bodyB=PAD+barH+screenH;
const screenX=PAD, screenY=PAD+barH;
const bodyRect=ck.LTRBRect(bodyL,bodyT,bodyR,bodyB);
const rr=ck.RRectXY(bodyRect,R,R);

const OUT=resolve("build/assets/frame");
await mkdir(OUT,{recursive:true});
const png=(sf)=>{ sf.flush(); return Buffer.from(sf.makeImageSnapshot().encodeToBytes()); };

// ---- back.png : shadow + white body ----
{
  const sf=ck.MakeSurface(frameW,frameH),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const sp=new ck.Paint(); sp.setColor(c4("#7A5A3A",0.30)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,45,true));
  cv.save(); cv.translate(0,26); cv.drawRRect(rr,sp); cv.restore();
  const bp=new ck.Paint(); bp.setColor(c4("#FFFFFF",1)); cv.drawRRect(rr,bp);
  await writeFile(join(OUT,"back.png"), png(sf)); sf.delete();
}
// ---- front.png : bar + dots + border (screen transparent) ----
{
  const sf=ck.MakeSurface(frameW,frameH),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  cv.save(); cv.clipRRect(rr,ck.ClipOp.Intersect,true);
  const barP=new ck.Paint(); barP.setColor(c4("#FBF7F0",1));
  cv.drawRect(ck.LTRBRect(bodyL,bodyT,bodyR,bodyT+barH),barP);
  const dots=["#FF5F57","#FEBC2E","#28C840"];
  for(let i=0;i<3;i++){ const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(dots[i])); cv.drawCircle(bodyL+24+i*24,bodyT+barH/2,7,dp); }
  cv.restore();
  const brd=new ck.Paint(); brd.setStyle(ck.PaintStyle.Stroke); brd.setStrokeWidth(2); brd.setAntiAlias(true); brd.setColor(c4("#000000",0.06));
  cv.drawRRect(rr,brd);
  await writeFile(join(OUT,"front.png"), png(sf)); sf.delete();
}
// ---- mask.png : screen alpha, square top / rounded bottom ----
{
  const sf=ck.MakeSurface(screenW,screenH),cv=sf.getCanvas(); cv.clear(c4("#000000",1)); // opaque black bg for clean alphamerge luma
  const white=new ck.Paint(); white.setColor(c4("#FFFFFF",1)); white.setAntiAlias(true);
  cv.drawRRect(ck.RRectXY(ck.LTRBRect(0,0,screenW,screenH),R,R),white); // all rounded
  cv.drawRect(ck.LTRBRect(0,0,screenW,R+2),white);                       // square the top
  await writeFile(join(OUT,"mask.png"), png(sf)); sf.delete();
}

await writeFile(join(OUT,"meta.json"), JSON.stringify({frameW,frameH,screenX,screenY,screenW,screenH,barH,R}));
console.log(`frame -> ${OUT} (${frameW}x${frameH}, screen ${screenW}x${screenH} @ ${screenX},${screenY})`);

// ===================== PHONE FRAME =====================
// For the guardian-app screen. Screen = the cropped app panel (default 300x712).
{
  const pSW=300, pSH=712, bez=16, pR=46, pPAD=80;
  const pFW=pSW+bez*2+pPAD*2, pFH=pSH+bez*2+pPAD*2;
  const pScreenX=pPAD+bez, pScreenY=pPAD+bez;
  const bodyRectP=ck.LTRBRect(pPAD,pPAD,pPAD+pSW+bez*2,pPAD+pSH+bez*2);
  const rrP=ck.RRectXY(bodyRectP,pR,pR);
  const POUT=resolve("build/assets/phoneframe");
  await mkdir(POUT,{recursive:true});
  // back: shadow + white body
  {
    const sf=ck.MakeSurface(pFW,pFH),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
    const sp=new ck.Paint(); sp.setColor(c4("#7A5A3A",0.34)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,42,true));
    cv.save(); cv.translate(0,22); cv.drawRRect(rrP,sp); cv.restore();
    const bp=new ck.Paint(); bp.setColor(c4("#FFFFFF",1)); cv.drawRRect(rrP,bp);
    await writeFile(join(POUT,"back.png"), png(sf)); sf.delete();
  }
  // front: border + a small top notch
  {
    const sf=ck.MakeSurface(pFW,pFH),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
    const brd=new ck.Paint(); brd.setStyle(ck.PaintStyle.Stroke); brd.setStrokeWidth(2); brd.setAntiAlias(true); brd.setColor(c4("#000000",0.06));
    cv.drawRRect(rrP,brd);
    // notch
    const nw=92,nh=24; const nx=pPAD+(pSW+bez*2)/2-nw/2, ny=pPAD+8;
    const np=new ck.Paint(); np.setColor(c4("#1B1B1B",1)); np.setAntiAlias(true);
    cv.drawRRect(ck.RRectXY(ck.LTRBRect(nx,ny,nx+nw,ny+nh),nh/2,nh/2),np);
    await writeFile(join(POUT,"front.png"), png(sf)); sf.delete();
  }
  // mask: rounded all corners (screen-sized)
  {
    const sf=ck.MakeSurface(pSW,pSH),cv=sf.getCanvas(); cv.clear(c4("#000000",1));
    const white=new ck.Paint(); white.setColor(c4("#FFFFFF",1)); white.setAntiAlias(true);
    cv.drawRRect(ck.RRectXY(ck.LTRBRect(0,0,pSW,pSH),pR-bez,pR-bez),white);
    await writeFile(join(POUT,"mask.png"), png(sf)); sf.delete();
  }
  await writeFile(join(POUT,"meta.json"), JSON.stringify({frameW:pFW,frameH:pFH,screenX:pScreenX,screenY:pScreenY,screenW:pSW,screenH:pSH}));
  console.log(`phoneframe -> ${POUT} (${pFW}x${pFH}, screen ${pSW}x${pSH} @ ${pScreenX},${pScreenY})`);
}
