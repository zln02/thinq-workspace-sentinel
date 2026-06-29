import * as L from "./lottie-lib.mjs";
import { writeFileSync } from "node:fs";
const W=460,H=720,FR=30,DUR=90,half=DUR/2;
const hx=L.hex;
const SKIN="#F7CFA3", SKINSH="#EBB98C", HAIR="#3A332C", COAT="#FFFFFF", COATSH="#E7ECE9",
      TIE="#2E8B6B", PANTS="#3D4A63", SHOE="#2A2622", LINE="#34302B", STETH="#5A6470", BLUSH="#F4A99A";
const SW=5;
// group helper — ALWAYS append a transform so Skottie renders it
const G=(items,{fill,fo=100,stroke,sw=SW,tr}={})=>{
  const it=[...items];
  if(fill) it.push(L.fill(hx(fill),fo));
  if(stroke) it.push(L.stroke(hx(stroke),sw));
  it.push(tr??L.shapeTransform({}));
  return L.group(it);
};
const cx=W/2;
// ---------- limbs ----------
const armRwave=L.animated([[0,[-112],"inOut"],[22,[-134],"inOut"],[45,[-112],"inOut"],[68,[-134],"inOut"],[90,[-112]]]);
const armR=L.group([
  G([L.rect({size:[46,150],pos:[0,72],round:22})],{fill:COAT,stroke:LINE}),
  G([L.ellipse({size:[46,46],pos:[0,150]})],{fill:SKIN,stroke:LINE}),
  L.shapeTransform({p:[cx+86,302],a:[0,0],r:armRwave})
]);
const armLsway=L.animated([[0,[10],"inOut"],[half,[18],"inOut"],[DUR,[10]]]);
const armL=L.group([
  G([L.rect({size:[46,150],pos:[0,72],round:22})],{fill:COAT,stroke:LINE}),
  G([L.ellipse({size:[46,46],pos:[0,150]})],{fill:SKIN,stroke:LINE}),
  L.shapeTransform({p:[cx-86,302],a:[0,0],r:armLsway})
]);
// legs + shoes
const legL=G([L.rect({size:[52,170],pos:[cx-32,560],round:24})],{fill:PANTS,stroke:LINE});
const legR=G([L.rect({size:[52,170],pos:[cx+32,560],round:24})],{fill:PANTS,stroke:LINE});
const shoeL=G([L.rect({size:[70,32],pos:[cx-34,648],round:16})],{fill:SHOE,stroke:LINE});
const shoeR=G([L.rect({size:[70,32],pos:[cx+34,648],round:16})],{fill:SHOE,stroke:LINE});
// coat body
const body=G([L.rect({size:[200,260],pos:[cx,420],round:66})],{fill:COAT,stroke:LINE});
const collar=G([L.path({pts:[[cx-44,300,0,0,0,0],[cx,360,0,0,0,0],[cx+44,300,0,0,0,0]],closed:false})],{stroke:LINE,sw:6});
const tie=G([L.path({pts:[[cx,318,0,0,0,0],[cx-16,360,0,0,0,0],[cx,470,0,0,0,0],[cx+16,360,0,0,0,0]],closed:true})],{fill:TIE,stroke:LINE,sw:3});
// stethoscope: U tube around neck + chestpiece
const steth=G([L.path({pts:[[cx-40,300,-6,-30,6,30],[cx-10,470,-10,-20,10,20],[cx+34,452,0,0,0,0]],closed:false})],{stroke:STETH,sw:7});
const stethHead=G([L.ellipse({size:[34,34],pos:[cx+40,452]})],{fill:STETH,stroke:LINE,sw:3});
const neck=G([L.rect({size:[48,46],pos:[cx,268],round:14})],{fill:SKINSH,stroke:LINE});
// ---------- head ----------
const blink=L.animated([[0,[100,100],"linear"],[52,[100,100],"linear"],[56,[100,12],"linear"],[60,[100,100],"linear"],[DUR,[100,100]]]);
const eye=(ex)=>L.group([
  G([L.ellipse({size:[26,30],pos:[ex,168]})],{fill:LINE, tr:L.shapeTransform({p:[ex,168],a:[ex,168],s:blink})}),
  G([L.ellipse({size:[8,8],pos:[ex+4,162]})],{fill:"#FFFFFF"})
]);
const headTilt=L.animated([[0,[-2.4],"inOut"],[half,[2.4],"inOut"],[DUR,[-2.4]]]);
const head=L.group([
  G([L.ellipse({size:[166,176],pos:[cx,170]})],{fill:SKIN,stroke:LINE}),                 // face
  G([L.path({pts:[[cx-86,150,0,-60,0,-30],[cx,70,-60,0,60,0],[cx+86,150,0,-30,0,-60],[cx,120,40,0,-40,0]],closed:true})],{fill:HAIR}), // hair sweep
  G([L.ellipse({size:[30,18],pos:[cx-52,196]})],{fill:BLUSH,fo:55}),                      // blush L
  G([L.ellipse({size:[30,18],pos:[cx+52,196]})],{fill:BLUSH,fo:55}),                      // blush R
  G([L.rect({size:[30,7],pos:[cx-40,140],round:4})],{fill:LINE}),                         // brow L
  G([L.rect({size:[30,7],pos:[cx+40,140],round:4})],{fill:LINE}),                         // brow R
  eye(cx-40), eye(cx+40),
  G([L.path({pts:[[cx-34,206,0,0,12,16],[cx,228,-16,8,16,8],[cx+34,206,-12,16,0,0]],closed:false})],{stroke:LINE,sw:6}), // smile
  L.shapeTransform({p:[cx,210],a:[cx,210],r:headTilt})
]);
// assemble back→front
const shapes=[legL,legR,shoeL,shoeR,armL,steth,body,collar,tie,stethHead,neck,armR,head];
const bs=L.animated([[0,[100,100,100],"inOut"],[half,[100.8,99.2,100],"inOut"],[DUR,[100,100,100]]]);
const bp=L.animated([[0,[0,0,0],"inOut"],[half,[0,-6,0],"inOut"],[DUR,[0,0,0]]]);
const layer=L.shapeLayer({nm:"doctor",op:DUR,shapes,ks:L.transform({a:[0,0,0],p:bp,s:bs,o:100})});
writeFileSync(process.argv[2],JSON.stringify(L.doc({w:W,h:H,fr:FR,op:DUR,nm:"vdoc2",layers:[layer]})));
console.log("vchar2",W,H);
