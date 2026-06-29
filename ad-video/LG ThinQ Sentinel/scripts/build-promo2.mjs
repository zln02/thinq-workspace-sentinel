// LIVE-VIDEO promo builder. Each feature scene = real footage playing inside a
// browser/phone frame (composited later by ffmpeg) + a TEXT-ONLY Lottie overlay
// (kicker/title/caption/chips). Writes per-scene text Lottie + build/promo2/manifest.json
// (with geometry + source-video segment for the ffmpeg composite step).
import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";
import * as L from "./lottie-lib.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");
const OUTROOT = resolve(ROOT, "build/promo2");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");
const A = resolve(ROOT, "build/assets");

const CREAM_T="#FCF7EF", CREAM_B="#F1E7D6", GLOW="#FFE9CC";
const GREEN="#0A6555", CHAR="#2C2823", MUTED="#7A7066", ROSE="#B23A63";

const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const W=1920,H=1080;
const c4=(h,a=1)=>{const s=h.replace("#","");return ck.Color4f(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,a);};
const T=(o)=>renderText(ck,o);
await mkdir(OUTROOT,{recursive:true});

// shared warm bg
{
  const sf=ck.MakeSurface(W,H),cv=sf.getCanvas();
  let p=new ck.Paint(); p.setShader(ck.Shader.MakeLinearGradient([0,0],[0,H],[c4(CREAM_T),c4(CREAM_B)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([520,300],820,[c4(GLOW,0.85),c4(GLOW,0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([1420,560],720,[c4("#FFF3E0",0.7),c4("#FFF3E0",0)],[0,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  p=new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([W/2,H/2],1180,[c4("#000000",0),c4("#5A4327",0.09)],[0.62,1],ck.TileMode.Clamp)); cv.drawRect(ck.LTRBRect(0,0,W,H),p);
  sf.flush(); await writeFile(join(OUTROOT,"bg.png"), Buffer.from(sf.makeImageSnapshot().encodeToBytes())); sf.delete();
}

// ---- inline text run (supports subscript, e.g. CO₂) -> PNG ----
async function runPNG(segs,{size=24,color=GREEN,letter=0.2,pad=3}={}){
  const imgs=[];
  for(const s of segs){
    const sz = s.sub? Math.round(size*0.62): size;
    const r = await renderText(ck,{text:s.t,fontPath:F_SEMI,size:sz,color,letter,pad:1});
    imgs.push({img:ck.MakeImageFromEncoded(r.buffer),w:r.width,h:r.height,sub:!!s.sub});
  }
  const maxH=Math.max(...imgs.map(i=>i.h));
  const totW=imgs.reduce((a,i)=>a+i.w,0)+pad*2;
  const totH=maxH+pad*2;
  const sf=ck.MakeSurface(totW,totH),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const ip=new ck.Paint(); ip.setAntiAlias(true);
  let x=pad;
  for(const i of imgs){
    const y = i.sub ? pad + (maxH - i.h) + Math.round(maxH*0.12) : pad + Math.round((maxH-i.h)/2);
    cv.drawImageRect(i.img,ck.LTRBRect(0,0,i.w,i.h),ck.LTRBRect(x,y,x+i.w,y+i.h),ip);
    x+=i.w;
  }
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete();
  return {buf,w:totW,h:totH};
}

// ---- pill (string or segments) ----
async function pillPNG(textOrSegs,{size=24,fg=GREEN,bg=GREEN,bgA=0.10,padX=22,padY=12,dot=false}={}){
  const inner = Array.isArray(textOrSegs)
    ? await runPNG(textOrSegs,{size,color:fg,pad:1})
    : await (async()=>{const r=await T({text:textOrSegs,fontPath:F_SEMI,size,color:fg,letter:0.2,pad:1});return{buf:r.buffer,w:r.width,h:r.height};})();
  const dotW=dot?26:0, pw=inner.w+padX*2+dotW, ph=inner.h+padY*2;
  const sf=ck.MakeSurface(pw,ph),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const rr=ck.RRectXY(ck.LTRBRect(0,0,pw,ph),ph/2,ph/2); const fp=new ck.Paint(); fp.setColor(c4(bg,bgA)); cv.drawRRect(rr,fp);
  let tx=padX;
  if(dot){const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(padX+5,ph/2,6,dp); tx=padX+dotW;}
  const ti=ck.MakeImageFromEncoded(inner.buf); const ip=new ck.Paint(); ip.setAntiAlias(true);
  cv.drawImageRect(ti,ck.LTRBRect(0,0,inner.w,inner.h),ck.LTRBRect(tx,padY,tx+inner.w,padY+inner.h),ip);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:pw,h:ph};
}

async function statChip(label,value,{w=320,h=140}={}){
  const sf=ck.MakeSurface(w+60,h+72),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const ox=30,oy=14; const rr=ck.RRectXY(ck.LTRBRect(ox,oy,ox+w,oy+h),24,24);
  const sp=new ck.Paint(); sp.setColor(c4("#3A2A18",0.30)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,24,true));
  cv.save(); cv.translate(0,12); cv.drawRRect(rr,sp); cv.restore();
  const cp=new ck.Paint(); cp.setColor(c4("#FFFFFF",0.98)); cv.drawRRect(rr,cp);
  const bp=new ck.Paint(); bp.setStyle(ck.PaintStyle.Stroke); bp.setStrokeWidth(2); bp.setColor(c4(GREEN,0.14)); cv.drawRRect(rr,bp);
  const dp=new ck.Paint(); dp.setAntiAlias(true); dp.setColor(c4(GREEN)); cv.drawCircle(ox+32,oy+42,7,dp);
  const lbl=await T({text:label,fontPath:F_SEMI,size:23,color:MUTED,pad:2});
  const li=ck.MakeImageFromEncoded(lbl.buffer); const ip=new ck.Paint(); ip.setAntiAlias(true);
  cv.drawImageRect(li,ck.LTRBRect(0,0,lbl.width,lbl.height),ck.LTRBRect(ox+48,oy+26,ox+48+lbl.width,oy+26+lbl.height),ip);
  const val=await T({text:value,fontPath:F_BOLD,size:58,color:GREEN,pad:2});
  const vi=ck.MakeImageFromEncoded(val.buffer);
  cv.drawImageRect(vi,ck.LTRBRect(0,0,val.width,val.height),ck.LTRBRect(ox+26,oy+58,ox+26+val.width,oy+58+val.height),ip);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:w+60,h:h+72};
}

async function notifCard(title,sub,accent){
  const w=372,h=104,ox=24,oy=14;
  const sf=ck.MakeSurface(w+48,h+56),cv=sf.getCanvas(); cv.clear(ck.TRANSPARENT);
  const rr=ck.RRectXY(ck.LTRBRect(ox,oy,ox+w,oy+h),22,22);
  const sp=new ck.Paint(); sp.setColor(c4("#3A2A18",0.26)); sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal,20,true));
  cv.save(); cv.translate(0,10); cv.drawRRect(rr,sp); cv.restore();
  const cp=new ck.Paint(); cp.setColor(c4("#FFFFFF",0.98)); cv.drawRRect(rr,cp);
  // accent rounded dot block
  const ap=new ck.Paint(); ap.setAntiAlias(true); ap.setColor(c4(accent,0.16));
  cv.drawRRect(ck.RRectXY(ck.LTRBRect(ox+18,oy+24,ox+62,oy+68),14,14),ap);
  const ad=new ck.Paint(); ad.setAntiAlias(true); ad.setColor(c4(accent)); cv.drawCircle(ox+40,oy+46,9,ad);
  const tt=await T({text:title,fontPath:F_BOLD,size:25,color:CHAR,letter:-0.3,pad:2});
  const st=await T({text:sub,fontPath:F_SEMI,size:19,color:MUTED,pad:2});
  const ip=new ck.Paint(); ip.setAntiAlias(true);
  const ti=ck.MakeImageFromEncoded(tt.buffer); cv.drawImageRect(ti,ck.LTRBRect(0,0,tt.width,tt.height),ck.LTRBRect(ox+78,oy+22,ox+78+tt.width,oy+22+tt.height),ip);
  const si=ck.MakeImageFromEncoded(st.buffer); cv.drawImageRect(si,ck.LTRBRect(0,0,st.width,st.height),ck.LTRBRect(ox+78,oy+58,ox+78+st.width,oy+58+st.height),ip);
  sf.flush(); const buf=Buffer.from(sf.makeImageSnapshot().encodeToBytes()); sf.delete(); return {buf,w:w+48,h:h+56};
}

const entrance=({P,fadeIn,rise=0,dx=0,scaleFrom=null,baseScale=100})=>{
  const cx=P.x+P.w/2, cy=P.y+P.h/2;
  let p;
  if(rise||dx) p=L.animated([[fadeIn[0],[cx-dx,cy+rise,0],"out"],[fadeIn[1]+4,[cx,cy,0]]]);
  else p=[cx,cy,0];
  return L.transform({ a:[P.w/2,P.h/2,0], p, o:L.fade({inA:fadeIn[0],inB:fadeIn[1]}),
    s: scaleFrom!=null?L.animated([[fadeIn[0],[baseScale*scaleFrom,baseScale*scaleFrom,100],"out"],[fadeIn[1]+4,[baseScale,baseScale,100]]]):[baseScale,baseScale,100] });
};

// ---- desktop frame display geometry ----
const DS=0.69;                                           // enlarged dashboard (was 0.62) — keeps aspect ratio
const FW=Math.round(1500*DS), FH=Math.round(980*DS);     // 1035 x 676
const VW=Math.round(1280*DS), VH=Math.round(720*DS);     // 883 x 497
const SOX=Math.round(110*DS), SOY=Math.round(150*DS);    // 76 x 104
const MYr=Math.round((H-FH)/2);

const manifest={scenes:[]};

async function featureScene(spec){
  const { id, idx, kicker, titleLines, caption, chips=[], statChips=[], side="right", OP=480, seg, speed=1.3, tmed=5 } = spec;
  const dir=join(OUTROOT,id), assets=join(dir,"assets"); await mkdir(assets,{recursive:true});
  const A_=[],LY=[];
  const place=async(aid,file,buf,w,h,ks)=>{ await writeFile(join(assets,file),buf); A_.push(L.imageAsset({id:aid,w,h,file})); LY.push(L.imageLayer({id:aid,refId:aid,w,h,op:OP,ks})); };

  const mX = side==="right" ? (W-FW-72) : 72;
  const mY = MYr;
  const vx = mX+SOX, vy = mY+SOY;
  const tx = side==="right" ? 132 : (mX+FW+60);

  // kicker
  const kp=await pillPNG([{t:`${idx} · ${kicker}`}],{dot:true});
  await place("kicker","kicker.png",kp.buf,kp.w,kp.h, entrance({P:{x:tx,y:300,w:kp.w,h:kp.h},fadeIn:[30,52],rise:12}));
  // title
  let ty=372;
  for(let i=0;i<titleLines.length;i++){
    const tl=titleLines[i]; const r=await T({text:tl.text,fontPath:F_BOLD,size:66,color:tl.green?GREEN:CHAR,letter:-1.4,pad:4});
    await place(`title${i}`,`title${i}.png`,r.buffer,r.width,r.height, entrance({P:{x:tx-4,y:ty,w:r.width,h:r.height},fadeIn:[44+i*12,72+i*12],rise:20}));
    ty+=r.height-10;
  }
  // caption
  { const r=await T({text:caption,fontPath:F_SEMI,size:28,color:MUTED,line:1.5,pad:4});
    await place("caption","caption.png",r.buffer,r.width,r.height, entrance({P:{x:tx,y:ty+26,w:r.width,h:r.height},fadeIn:[80,104],rise:8}));
    ty+=r.height+26; }
  // feature pills
  let px=tx, py=ty+40;
  for(let i=0;i<chips.length;i++){
    const cp=await pillPNG(chips[i],{size:23,padX:18,padY:11});
    await place(`chip${i}`,`chip${i}.png`,cp.buf,cp.w,cp.h, entrance({P:{x:px,y:py,w:cp.w,h:cp.h},fadeIn:[112+i*10,134+i*10],scaleFrom:0.85}));
    px+=cp.w+14; if(px>tx+760){px=tx; py+=cp.h+14;}
  }
  // stat chips on the video (bottom-left of screen)
  for(let i=0;i<statChips.length;i++){
    const sc=statChips[i]; const s=await statChip(sc.label,sc.value);
    const cardX = vx+24, cardY = vy+VH - s.h + 34;
    await place(`stat${i}`,`stat${i}.png`,s.buf,s.w,s.h, entrance({P:{x:cardX,y:cardY,w:s.w,h:s.h},fadeIn:[150,176],scaleFrom:0.9}));
  }

  LY.reverse();
  await writeFile(join(dir,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:id,assets:A_,layers:LY})));
  manifest.scenes.push({ id, OP, kind:"desktop", seg, speed, tmed, geom:{mX,mY,fw:FW,fh:FH,vx,vy,vw:VW,vh:VH} });
  console.log(`scene ${id} (desktop, ${side})`);
}

async function phoneScene(spec){
  const { id, idx, kicker, titleLines, caption, chips=[], OP=480, seg, crop, speed=1.3, tmed=4 } = spec;
  const dir=join(OUTROOT,id), assets=join(dir,"assets"); await mkdir(assets,{recursive:true});
  const A_=[],LY=[];
  const place=async(aid,file,buf,w,h,ks)=>{ await writeFile(join(assets,file),buf); A_.push(L.imageAsset({id:aid,w,h,file})); LY.push(L.imageLayer({id:aid,refId:aid,w,h,op:OP,ks})); };
  const pmeta=JSON.parse(await readFile(resolve(A,"phoneframe/meta.json"),"utf8"));
  // enlarge the phone so the REAL app screen is the focus (no synthetic overlays)
  const PS=1.18;
  const fw=Math.round(pmeta.frameW*PS), fh=Math.round(pmeta.frameH*PS);
  const vw=Math.round(pmeta.screenW*PS), vh=Math.round(pmeta.screenH*PS);
  const mX=300, mY=Math.round((H-fh)/2);
  const vx=mX+Math.round(pmeta.screenX*PS), vy=mY+Math.round(pmeta.screenY*PS);
  const tx=mX+fw+74;

  const kp=await pillPNG([{t:`${idx} · ${kicker}`}],{dot:true});
  await place("kicker","kicker.png",kp.buf,kp.w,kp.h, entrance({P:{x:tx,y:330,w:kp.w,h:kp.h},fadeIn:[30,52],rise:12}));
  let ty=402;
  for(let i=0;i<titleLines.length;i++){
    const tl=titleLines[i]; const r=await T({text:tl.text,fontPath:F_BOLD,size:66,color:tl.green?GREEN:CHAR,letter:-1.4,pad:4});
    await place(`title${i}`,`title${i}.png`,r.buffer,r.width,r.height, entrance({P:{x:tx-4,y:ty,w:r.width,h:r.height},fadeIn:[44+i*12,72+i*12],rise:20}));
    ty+=r.height-10;
  }
  { const r=await T({text:caption,fontPath:F_SEMI,size:28,color:MUTED,line:1.5,pad:4});
    await place("caption","caption.png",r.buffer,r.width,r.height, entrance({P:{x:tx,y:ty+26,w:r.width,h:r.height},fadeIn:[80,104],rise:8})); ty+=r.height+26; }
  let px=tx, py=ty+40;
  for(let i=0;i<chips.length;i++){
    const cp=await pillPNG(chips[i],{size:23,padX:18,padY:11});
    await place(`chip${i}`,`chip${i}.png`,cp.buf,cp.w,cp.h, entrance({P:{x:px,y:py,w:cp.w,h:cp.h},fadeIn:[112+i*10,134+i*10],scaleFrom:0.85}));
    px+=cp.w+14; if(px>tx+560){px=tx; py+=cp.h+14;}
  }

  LY.reverse();
  await writeFile(join(dir,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:id,assets:A_,layers:LY})));
  manifest.scenes.push({ id, OP, kind:"phone", seg, crop, speed, tmed, geom:{mX,mY,fw,fh,vx,vy,vw,vh} });
  console.log(`scene ${id} (phone, enlarged)`);
}

async function outro(){
  const id="s7_outro", OP=360;
  const dir=join(OUTROOT,id), assets=join(dir,"assets"); await mkdir(assets,{recursive:true});
  const A_=[],LY=[];
  const place=async(aid,file,buf,w,h,ks,ip=0,opv=OP)=>{ await writeFile(join(assets,file),buf); A_.push(L.imageAsset({id:aid,w,h,file})); LY.push({ty:2,nm:aid,refId:aid,ip,op:opv,st:0,ks}); };
  const cx=W/2;

  // --- VERTICAL centered stack: BIG logo on top, name + tagline below ---
  const lSize=300;
  const lg=await T({text:"LG ThinQ",fontPath:F_SEMI,size:34,color:"#5A5048",letter:1,pad:2});
  const nm=await T({text:"Space Sentinel",fontPath:F_BOLD,size:78,color:GREEN,letter:-1.5,pad:2});
  const tag=await T({text:"공간을 지키는, 가장 똑똑한 방법",fontPath:F_SEMI,size:32,color:MUTED,pad:4});
  const org=await T({text:"LG 디지털 요양병원  ·  AI 감염관제 시스템",fontPath:F_SEMI,size:22,color:"#9A8C7C",letter:1,pad:4});

  // stack metrics (centered as one group)
  const gLogoGap=34, gNameGap=4, gTagGap=34, gOrgGap=24;
  const groupH=lSize+gLogoGap+lg.height+gNameGap+nm.height+gTagGap+tag.height+gOrgGap+org.height;
  let y=Math.round((H-groupH)/2);
  const logoCx=cx, logoCy=y+lSize/2;

  // sensing pulse rings behind logo (expand well beyond the icon so the burst reads, icon dead-centre)
  const ringLayer=(delay,r1)=>L.shapeLayer({ nm:"ring", ip:0, op:OP,
    ks:L.transform({p:[logoCx,logoCy,0]}),
    shapes:[L.group([L.ellipse({size:[120,120]}),L.stroke(L.hex(GREEN),3),
      L.shapeTransform({ s:L.animated([[delay,[150,150],"out"],[delay+110,[r1,r1]]]), o:L.animated([[delay,[45],"out"],[delay+110,[0]]]) })],"ring")]});
  LY.push(ringLayer(16,520)); LY.push(ringLayer(70,520)); LY.push(ringLayer(124,520));

  const logoBuf=await readFile(join(A,"logomark.png"));
  // declare asset at TRUE 512px size, anchor at its real centre (256), scale down to lSize — keeps it concentric with the pulse rings
  await place("logo","logo.png",logoBuf,512,512, L.transform({a:[256,256,0],p:[logoCx,logoCy,0],o:L.fade({inA:6,inB:32}),
    s:L.animated([[6,[lSize/512*80,lSize/512*80,100],"out"],[42,[lSize/512*100,lSize/512*100,100]]])}));
  y+=lSize+gLogoGap;
  await place("lg","lg.png",lg.buffer,lg.width,lg.height, entrance({P:{x:cx-lg.width/2,y,w:lg.width,h:lg.height},fadeIn:[24,48],rise:8}));
  y+=lg.height+gNameGap;
  await place("nm","nm.png",nm.buffer,nm.width,nm.height, entrance({P:{x:cx-nm.width/2,y,w:nm.width,h:nm.height},fadeIn:[30,56],rise:12}));
  y+=nm.height+gTagGap;
  await place("tag","tag.png",tag.buffer,tag.width,tag.height, entrance({P:{x:cx-tag.width/2,y,w:tag.width,h:tag.height},fadeIn:[58,86],rise:8}));
  y+=tag.height+gOrgGap;
  await place("org","org.png",org.buffer,org.width,org.height, entrance({P:{x:cx-org.width/2,y,w:org.width,h:org.height},fadeIn:[78,106]}));

  LY.reverse();
  await writeFile(join(dir,"lottie.json"), JSON.stringify(L.doc({w:W,h:H,fr:60,op:OP,nm:id,assets:A_,layers:LY})));
  manifest.scenes.push({ id, OP, kind:"static" });
  console.log(`scene ${id} (outro, lockup)`);
}

// ================= SCENE DEFINITIONS (with footage segments) =================
await featureScene({ id:"s2_monitor", idx:"01", kicker:"실시간 관제", side:"right", seg:{start:18,dur:14}, OP:720, speed:1.9,
  titleLines:[{text:"병실 환경과 환자 상태를"},{text:"실시간으로 관제",green:true}],
  caption:"병실 내부 환경부터 환자 정보까지\n한 화면에서 바로 확인합니다.",
  chips:[[{t:"CO"},{t:"2",sub:true},{t:" 실시간"}], "온·습도", "환자 정보"] });

await featureScene({ id:"s3_ai", idx:"02", kicker:"AI 감염위험 예측", side:"left", seg:{start:180,dur:9}, tmed:2,
  titleLines:[{text:"감염 위험을"},{text:"AI가 미리 예측",green:true}],
  caption:"Wells-Riley 모델로 공간별 감염 위험도를\n실시간으로 산출합니다.",
  chips:["Wells-Riley 모델","공간별 위험도","실시간 산출"] });

await featureScene({ id:"s4_auto", idx:"03", kicker:"ThinQ 자동 방역", side:"right", seg:{start:117,dur:11},
  titleLines:[{text:"위험을 감지하면"},{text:"가전이 자동 대응",green:true}],
  caption:"공기청정·환기·제습·살균까지\n어떤 가전이 작동 중인지 한눈에.",
  chips:["공기청정기","환기 시스템","제습","로봇 살균"] });

await phoneScene({ id:"s5_guardian", idx:"04", kicker:"보호자 안심 케어", seg:{start:190,dur:22}, OP:840, speed:0.66, crop:"300:712:494:4",
  titleLines:[{text:"보호자도"},{text:"실시간으로 안심",green:true}],
  caption:"앱을 켜면 홈에서 병동까지,\n지금 병원이 무엇을 하는지 한눈에.",
  chips:["가족 안심 케어","병동 현황","24시간 알림"] });

await featureScene({ id:"s6_report", idx:"05", kicker:"경영 성과 리포트", side:"right", seg:{start:135,dur:9},
  titleLines:[{text:"성과는"},{text:"리포트로 자동 증빙",green:true}],
  caption:"감염 완화·비용 절감·법규 준수까지\n데이터로 자동 정리됩니다.",
  chips:["감염 완화","비용 절감","법규 준수"] });

await outro();

await writeFile(join(OUTROOT,"manifest.json"), JSON.stringify(manifest,null,2));
console.log("PROMO2 (live) built:", manifest.scenes.map(s=>s.id).join(", "));
