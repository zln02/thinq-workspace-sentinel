// Flat vector doctor mascot built as Lottie JSON (rigged, natural wave loop).
import * as L from "./lottie-lib.mjs";
import { writeFileSync } from "node:fs";
const W=440,H=640,FR=30,DUR=90,half=DUR/2;
const H_=(h)=>L.hex(h);
const SKIN="#F6CDA0", HAIR="#2A2622", COAT="#FFFFFF", COATSH="#E9ECEA", TIE="#2E8B6B", PANTS="#4C5A3A", SHOE="#2A2622", LINE="#2A2622";
// helper: filled (+optional stroke) shape group with its own transform
const part=(shapes, fillHex, {stroke=null, sw=4, tr=null}={})=>{
  const it=[...shapes, L.fill(H_(fillHex))];
  if(stroke) it.push(L.stroke(H_(stroke), sw));
  it.push(tr ?? L.shapeTransform({}));
  return L.group(it);
};
const cx=W/2;
// ---- limbs with pivots ----
// right arm (viewer-right) waving: shoulder pivot ~ (cx+78, 300)
const shoulderR=[cx+74,300];
const armRshape=L.rect({size:[40,150],pos:[0,70],round:20}); // hangs from pivot (top at 0)
const armRwave=L.animated([[0,[-108],"inOut"],[22,[-128],"inOut"],[45,[-108],"inOut"],[68,[-128],"inOut"],[90,[-108]]]);
const armR=L.group([armRshape, L.fill(H_(COAT)), L.stroke(H_(LINE),4),
  L.shapeTransform({p:shoulderR,a:[0,0],r:armRwave})],"armR");
// hand (skin) on right arm tip — parent via same rotation: include in same group before transform
const armRfull=L.group([ L.group([armRshape,L.fill(H_(COAT)),L.stroke(H_(LINE),4)]),
  L.group([L.ellipse({size:[40,40],pos:[0,150]}),L.fill(H_(SKIN)),L.stroke(H_(LINE),4)]),
  L.shapeTransform({p:shoulderR,a:[0,0],r:armRwave}) ],"armRfull");
// left arm static slight sway
const shoulderL=[cx-74,300];
const armLwave=L.animated([[0,[12],"inOut"],[half,[20],"inOut"],[DUR,[12]]]);
const armL=L.group([ L.group([L.rect({size:[40,150],pos:[0,70],round:20}),L.fill(H_(COAT)),L.stroke(H_(LINE),4)]),
  L.group([L.ellipse({size:[40,40],pos:[0,150]}),L.fill(H_(SKIN)),L.stroke(H_(LINE),4)]),
  L.shapeTransform({p:shoulderL,a:[0,0],r:armLwave}) ],"armL");
// legs
const legL=part([L.rect({size:[46,150],pos:[cx-30,500],round:20})],PANTS,{stroke:LINE});
const legR=part([L.rect({size:[46,150],pos:[cx+30,500],round:20})],PANTS,{stroke:LINE});
const shoeL=part([L.rect({size:[60,30],pos:[cx-34,580],round:14})],SHOE);
const shoeR=part([L.rect({size:[60,30],pos:[cx+34,580],round:14})],SHOE);
// body coat
const body=part([L.rect({size:[180,240],pos:[cx,360],round:46})],COAT,{stroke:LINE});
const lapel=part([L.rect({size:[60,150],pos:[cx,330],round:20})],COATSH);
const tie=part([L.rect({size:[26,90],pos:[cx,300],round:8})],TIE,{stroke:LINE,sw:2});
// neck
const neck=part([L.rect({size:[44,40],pos:[cx,232],round:10})],SKIN);
// head + hair + face (head group rocks slightly)
const headTilt=L.animated([[0,[-2.5],"inOut"],[half,[2.5],"inOut"],[DUR,[-2.5]]]);
const headPivot=[cx,200];
const headGrp=L.group([
  L.group([L.ellipse({size:[150,158],pos:[cx,170]}),L.fill(H_(SKIN)),L.stroke(H_(LINE),4)]),       // face
  L.group([L.rect({size:[170,90],pos:[cx,108],round:50}),L.fill(H_(HAIR))]),                        // hair top
  L.group([L.ellipse({size:[20,26],pos:[cx-30,175]}),L.fill(H_(LINE))]),                            // eye L
  L.group([L.ellipse({size:[20,26],pos:[cx+30,175]}),L.fill(H_(LINE))]),                            // eye R
  L.group([L.ellipse({size:[70,60],pos:[cx,205]}),L.stroke(H_(LINE),5),L.trim({start:58,end:92})]), // smile arc
  L.shapeTransform({p:headPivot,a:headPivot,r:headTilt})
],"head");
// assemble back→front
const shapes=[legL,legR,shoeL,shoeR,armL,body,lapel,tie,neck,armRfull,headGrp];
// whole-body breathing + bob via layer transform
const bs=L.animated([[0,[100,100,100],"inOut"],[half,[101,99,100],"inOut"],[DUR,[100,100,100]]]);
const bp=L.animated([[0,[0,0,0],"inOut"],[half,[0,-5,0],"inOut"],[DUR,[0,0,0]]]);
const layer=L.shapeLayer({nm:"doctor",op:DUR,shapes,ks:L.transform({a:[0,0,0],p:bp,s:bs,o:100})});
writeFileSync(process.argv[2], JSON.stringify(L.doc({w:W,h:H,fr:FR,op:DUR,nm:"vdoctor",layers:[layer]})));
console.log("vchar json", W, H);
