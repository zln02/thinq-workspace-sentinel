// Builds the feature scenes (02-06) + outro for the LG ThinQ Space Sentinel
// promo, in the warm premium style. Each scene -> build/promo/<id>/{lottie.json,
// assets/*}. Writes build/promo/manifest.json. Scene 1 (intro) reuses build/hero.
// Compositing + concat happens in a separate ffmpeg step.
import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";
import * as L from "./lottie-lib.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");
const PROMO = resolve(ROOT, "build/promo");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");
const A = resolve(ROOT, "build/assets");

const CREAM_T="#FCF7EF", CREAM_B="#F1E7D6", GLOW="#FFE9CC";
const GREEN="#0A6555", GREEN_L="#127A63", CHAR="#2C2823", MUTED="#7A7066";

const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const W=1920,H=1080;
const c4=(h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};
const T=(o)=>renderText(ck,o);

await mkdir(PROMO,{recursive:true});

// ---- shared warm background ----
function renderBG(){
  const sf=ck.MakeSurface(W,H),cv=sf.getCanvas();
  let p=new ck.Paint(); p.setShader(ck.Shader.MakeLinearGradient([0,0],[0,H],[c4(CREAM_T),c4(CREAM_B)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([520,300],820,[c4(GLOW,0.85),c4(GLOW,0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([1420,560],720,[c4("#FFF3E0",0.7),c4("#FFF3E0",0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([W/2,H/2],1180,[c4("#000000",0),c4("#5A4327",0.09)],[0.62,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return buf;
}
const bgBuf = renderBG();
await writeFile(join(PROMO,"bg.png"), bgBuf);

// ---- helpers to render small UI bits to PNG ----
async function pillPNG(text,{size=24,fg=GREEN,bg=GREEN,bgA=0.10,padX=22,padY=12,dot=false}={}){
  const txt=await T({text,fontPath:F_SEMI,size,color:fg,letter:0.2,pad:2});
  const dotW = dot?26:0;
  const pw=txt.width+padX*2+dotW, ph=txt.height+padY*2;
  const sf=ck.MakeSurface(pw,ph),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const rr=ck.RRectXY(ck.LTRBRect(0,0,pw,ph),ph/2,ph/2); const fp=new ck.Paint(); fp.setColor(c4(bg,bgA)); cv.drawRRect(rr,fp);
  let tx=padX;
  if(dot){ const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(padX+5,ph/2,6,dp); tx=padX+dotW; }
  const ti=ck.MakeImageFromEncoded(txt.buffer); const ip=new ck.Paint(); ip.setAntiAlias(true);
  cv.drawImageRect(ti,ck.LTRBRect(0,0,txt.width,txt.height),ck.LTRBRect(tx,padY,tx+txt.width,padY+txt.height),ip);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:pw,h:ph};
}

async function statChip(label,value,{w=330,h=140}={}){
  const sf=ck.MakeSurface(w+60,h+72),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const ox=30,oy=14; const rr=ck.RRectXY(ck.LTRBRect(ox,oy,ox+w,oy+h),24,24);
  const sp=new ck.Paint(); sp.setColor(c4("#7A5A3A",0.26)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,24,true));
  cv.save(); cv.translate(0,12); cv.drawRRect(rr,sp); cv.restore();
  const cp=new ck.Paint(); cp.setColor(c4("#FFFFFF",0.97)); cv.drawRRect(rr,cp);
  const bp=new ck.Paint(); bp.setStyle(ck.PaintStyle.Stroke); bp.setStrokeWidth(2); bp.setColor(c4(GREEN,0.12)); cv.drawRRect(rr,bp);
  const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(ox+32,oy+42,7,dp);
  const lbl=await T({text:label,fontPath:F_SEMI,size:24,color:MUTED,pad:2});
  const li=ck.MakeImageFromEncoded(lbl.buffer); const ip=new ck.Paint(); ip.setAntiAlias(true);
  cv.drawImageRect(li,ck.LTRBRect(0,0,lbl.width,lbl.height),ck.LTRBRect(ox+48,oy+26,ox+48+lbl.width,oy+26+lbl.height),ip);
  const val=await T({text:value,fontPath:F_BOLD,size:58,color:GREEN,pad:2});
  const vi=ck.MakeImageFromEncoded(val.buffer);
  cv.drawImageRect(vi,ck.LTRBRect(0,0,val.width,val.height),ck.LTRBRect(ox+26,oy+60,ox+26+val.width,oy+60+val.height),ip);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:w+60,h:h+72};
}

// phone-framed screenshot for the guardian app
async function phoneMockup(srcPath){
  const shot=ck.MakeImageFromEncoded(await readFile(srcPath));
  const sw=shot.width(), sh=shot.height();
  const bez=18, rad=54, pad=80;
  const bodyW=sw+bez*2, bodyH=sh+bez*2;
  const W2=bodyW+pad*2, H2=bodyH+pad*2;
  const sf=ck.MakeSurface(W2,H2),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const bodyRect=ck.LTRBRect(pad,pad,pad+bodyW,pad+bodyH); const rr=ck.RRectXY(bodyRect,rad,rad);
  // shadow
  const sp=new ck.Paint(); sp.setColor(c4("#7A5A3A",0.32)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,46,true));
  cv.save(); cv.translate(0,20); cv.drawRRect(rr,sp); cv.restore();
  // white bezel body
  const bp=new ck.Paint(); bp.setColor(c4("#FFFFFF",1)); cv.drawRRect(rr,bp);
  // screen
  const scrRect=ck.LTRBRect(pad+bez,pad+bez,pad+bez+sw,pad+bez+sh); const sr=ck.RRectXY(scrRect,rad-bez,rad-bez);
  cv.save(); cv.clipRRect(sr,ck.ClipOp.Intersect,true);
  const ip=new ck.Paint(); ip.setAntiAlias(true); cv.drawImageRect(shot,ck.LTRBRect(0,0,sw,sh),scrRect,ip);
  cv.restore();
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:W2,h:H2};
}

// ---- generic image-layer entrance ----
const entrance=({P,fadeIn,rise=0,dx=0,scaleFrom=null,baseScale=100})=>{
  const cx=P.x+P.w/2, cy=P.y+P.h/2;
  let p;
  if(rise||dx) p=L.animated([[fadeIn[0],[cx-dx,cy+rise,0],"out"],[fadeIn[1]+4,[cx,cy,0]]]);
  else p=[cx,cy,0];
  return L.transform({ a:[P.w/2,P.h/2,0], p, o:L.fade({inA:fadeIn[0],inB:fadeIn[1]}),
    s: scaleFrom!=null?L.animated([[fadeIn[0],[baseScale*scaleFrom,baseScale*scaleFrom,100],"out"],[fadeIn[1]+4,[baseScale,baseScale,100]]]):[baseScale,baseScale,100] });
};

const scenes=[]; // manifest entries

// ============ FEATURE SCENE BUILDER ============
async function featureScene(spec){
  const { id, idx, kicker, titleLines, caption, mockupFile, phoneSrc, chips=[], statChips=[], side="right", OP=400 } = spec;
  const dir=join(PROMO,id), assets=join(dir,"assets");
  await mkdir(assets,{recursive:true});
  const A_=[], LY=[]; // lottie assets / layers (bottom->top, reversed at end)
  const place=async(aid,file,buf,w,h,ks)=>{ await writeFile(join(assets,file),buf); A_.push(L.imageAsset({id:aid,w,h,file})); LY.push(L.imageLayer({id:aid,refId:aid,w,h,op:OP,ks})); };

  // ---- mockup ----
  let mk;
  if(phoneSrc){ mk=await phoneMockup(phoneSrc); }
  else { mk={buf:await readFile(join(A,mockupFile)), }; const im=ck.MakeImageFromEncoded(mk.buf); mk.w=im.width(); mk.h=im.height(); }
  const isPhone=!!phoneSrc;
  const mScale = isPhone? 0.74 : 0.64;
  const mW=mk.w*mScale, mH=mk.h*mScale;
  const mX = side==="right" ? (W - mW - 70) : 70;
  const mY = (H-mH)/2 + (isPhone?0:6);
  const slide = side==="right"? 50 : -50;
  {
    const cx=mX+mW/2, cy=mY+mH/2, base=mScale*100;
    const ks=L.transform({ a:[mk.w/2,mk.h/2,0],
      p:L.animated([[6,[cx-slide,cy+14,0],"out"],[56,[cx,cy,0]]]),
      o:L.fade({inA:6,inB:50}),
      s:L.animated([[6,[base*0.97,base*0.97,100],"out"],[56,[base,base,100]]]) });
    await place("mockup", isPhone?"phone.png":mockupFile, mk.buf, mk.w, mk.h, ks);
  }

  // ---- text zone ----
  const tx = side==="right" ? 132 : 1066;
  // kicker pill "idx · name"
  const kp=await pillPNG(`${idx} · ${kicker}`,{dot:true});
  const kP={x:tx,y:300,w:kp.w,h:kp.h};
  await place("kicker","kicker.png",kp.buf,kp.w,kp.h, entrance({P:kP,fadeIn:[30,52],rise:12}));

  // title lines
  let ty=372;
  for(let i=0;i<titleLines.length;i++){
    const tl=titleLines[i];
    const r=await T({text:tl.text,fontPath:F_BOLD,size:66,color:tl.green?GREEN:CHAR,letter:-1.4,pad:4});
    const P={x:tx-4,y:ty,w:r.width,h:r.height};
    await place(`title${i}`,`title${i}.png`,r.buf?r.buf:r.buffer,r.width,r.height, entrance({P,fadeIn:[44+i*12,72+i*12],rise:20}));
    ty+=r.height-10;
  }
  // caption
  {
    const r=await T({text:caption,fontPath:F_SEMI,size:28,color:MUTED,line:1.5,pad:4});
    const P={x:tx,y:ty+26,w:r.width,h:r.height};
    await place("caption","caption.png",r.buffer,r.width,r.height, entrance({P,fadeIn:[80,104],rise:8}));
    ty+=r.height+26;
  }
  // feature pills row (under caption)
  let px=tx, py=ty+40;
  for(let i=0;i<chips.length;i++){
    const cp=await pillPNG(chips[i],{size:23,fg:GREEN,bg:GREEN,bgA:0.10,padX:18,padY:11});
    const P={x:px,y:py,w:cp.w,h:cp.h};
    await place(`chip${i}`,`chip${i}.png`,cp.buf,cp.w,cp.h, entrance({P,fadeIn:[112+i*10,134+i*10],scaleFrom:0.85}));
    px+=cp.w+14;
    if(px>tx+700){ px=tx; py+=cp.h+14; }
  }
  // stat chips on the mockup (e.g. risk gauge)
  for(let i=0;i<statChips.length;i++){
    const sc=statChips[i];
    const s=await statChip(sc.label,sc.value);
    const cardX = side==="right" ? mX+44 : mX+mW-s.w+16;
    const cardY = mY+mH-s.h+30;
    const P={x:cardX,y:cardY,w:s.w,h:s.h};
    await place(`stat${i}`,`stat${i}.png`,s.buf,s.w,s.h, entrance({P,fadeIn:[120,146],scaleFrom:0.9}));
  }

  LY.reverse();
  await writeFile(join(dir,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:id,assets:A_,layers:LY})));
  scenes.push({id,frames:OP});
  console.log(`scene ${id} built (${OP}f, side=${side})`);
}

// ============ OUTRO ============
async function outro(){
  const id="s7_outro", OP=320;
  const dir=join(PROMO,id), assets=join(dir,"assets");
  await mkdir(assets,{recursive:true});
  const A_=[],LY=[];
  const place=async(aid,file,buf,w,h,ks)=>{ await writeFile(join(assets,file),buf); A_.push(L.imageAsset({id:aid,w,h,file})); LY.push(L.imageLayer({id:aid,refId:aid,w,h,op:OP,ks})); };

  const logoBuf=await readFile(join(A,"logomark.png"));
  const lSize=190, cx=W/2;
  const logoP={x:cx-lSize/2,y:300,w:lSize,h:lSize};
  await place("logo","logo.png",logoBuf,lSize,lSize, (()=>{const c=[logoP.x+lSize/2,logoP.y+lSize/2,0];return L.transform({a:[256,256,0],p:c,o:L.fade({inA:6,inB:34}),s:L.animated([[6,[lSize/512*80,lSize/512*80,100],"out"],[40,[lSize/512*100,lSize/512*100,100]]])});})());

  const nm=await T({text:"LG ThinQ Space Sentinel",fontPath:F_BOLD,size:62,color:CHAR,letter:-1.2,pad:4});
  const nmP={x:cx-nm.width/2,y:logoP.y+lSize+34,w:nm.width,h:nm.height};
  await place("nm","nm.png",nm.buffer,nm.width,nm.height, entrance({P:nmP,fadeIn:[26,52],rise:14}));

  const tag=await T({text:"공간을 지키는, 가장 똑똑한 방법",fontPath:F_SEMI,size:32,color:MUTED,letter:0,pad:4});
  const tagP={x:cx-tag.width/2,y:nmP.y+nm.height+18,w:tag.width,h:tag.height};
  await place("tag","tag.png",tag.buffer,tag.width,tag.height, entrance({P:tagP,fadeIn:[44,70],rise:8}));

  // CTA pill
  const cta=await pillPNG("도입 문의 · LG 디지털 요양병원",{size:26,fg:"#FFFFFF",bg:GREEN,bgA:1,padX:34,padY:18});
  const ctaP={x:cx-cta.w/2,y:tagP.y+tag.height+52,w:cta.w,h:cta.h};
  await place("cta","cta.png",cta.buf,cta.w,cta.h, entrance({P:ctaP,fadeIn:[66,92],scaleFrom:0.9}));

  LY.reverse();
  await writeFile(join(dir,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:id,assets:A_,layers:LY})));
  scenes.push({id,frames:OP});
  console.log(`scene ${id} (outro) built`);
}

// ============ DEFINE SCENES ============
await featureScene({ id:"s2_monitor", idx:"01", kicker:"실시간 관제", side:"right", mockupFile:"mockup_kwanje.png",
  titleLines:[{text:"병동 환경을"},{text:"실시간으로 관제",green:true}],
  caption:"CO₂·미세먼지·온습도·재실 인원까지\n모든 공간을 한눈에 모니터링합니다.",
  chips:["CO₂ 실시간","미세먼지 PM2.5","재실 인원"] });

await featureScene({ id:"s3_ai", idx:"02", kicker:"AI 감염위험 예측", side:"left", mockupFile:"mockup_ai.png",
  titleLines:[{text:"감염 위험을"},{text:"AI가 미리 예측",green:true}],
  caption:"Wells-Riley 모델로 공간별 감염 위험도를\n실시간으로 산출합니다.",
  statChips:[{label:"감염 위험도",value:"83.6%"}] });

await featureScene({ id:"s4_auto", idx:"03", kicker:"ThinQ 자동 방역", side:"right", mockupFile:"mockup_auto.png",
  titleLines:[{text:"위험을 감지하면"},{text:"가전이 자동 대응",green:true}],
  caption:"공기청정·환기·제습·살균까지\nThinQ 가전이 스스로 작동합니다.",
  chips:["공기청정기","환기 시스템","제습","로봇 살균"] });

await featureScene({ id:"s5_guardian", idx:"04", kicker:"보호자 안심 케어", side:"left", phoneSrc:resolve("C:/Users/rjwlt/AppData/Local/Temp/claude/C--Users-rjwlt-Desktop---/cccc51d7-60b8-4efd-afb3-24cea6ba2bf4/scratchpad/phone_crop.png"),
  titleLines:[{text:"보호자도"},{text:"실시간으로 안심",green:true}],
  caption:"지금 병원이 무엇을 하는지\n보호자가 투명하게 확인합니다.",
  chips:["긴급 대응 알림","24시간 케어"] });

await featureScene({ id:"s6_report", idx:"05", kicker:"경영 성과 리포트", side:"right", mockupFile:"mockup_report.png",
  titleLines:[{text:"성과는"},{text:"리포트로 자동 증빙",green:true}],
  caption:"감염 완화·비용 절감·법규 준수까지\n데이터로 자동 정리됩니다.",
  statChips:[{label:"감염 완화 효과",value:"83.6%"}] });

await outro();

await writeFile(join(PROMO,"manifest.json"), JSON.stringify({scenes},null,2));
console.log("PROMO BUILT. scenes:", scenes.map(s=>s.id).join(", "));
