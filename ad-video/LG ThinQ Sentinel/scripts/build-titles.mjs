import CanvasKitInit from "canvaskit-wasm/full";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { renderText } from "./text-render.mjs";
const require = createRequire(import.meta.url);
const ROOT = resolve("."); const OUT = resolve(ROOT, "build/overlays");
const F_BOLD = resolve(ROOT, "assets/fonts/NotoSansKR-Bold.ttf");
const F_SEMI = resolve(ROOT, "assets/fonts/NotoSansKR-SemiBold.ttf");
const ck = await CanvasKitInit({ locateFile: () => resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm") });
const W=1920,H=1080,GREEN="#0A6555",MUTED="#6E6A62";
const T=(o)=>renderText(ck,o);
function blit(cv,buf,x,y,w,h){const img=ck.MakeImageFromEncoded(buf);const ip=new ck.Paint();ip.setAntiAlias(true);cv.drawImageRect(img,ck.LTRBRect(0,0,w,h),ck.LTRBRect(x,y,x+w,y+h),ip);}
const ICON = await readFile(resolve(ROOT,"build/assets/logomark.png"));
async function title(id, tag){
  const sf=ck.MakeSurface(W,H),cv=sf.getCanvas();cv.clear(ck.TRANSPARENT);
  const iconSz=132;
  // 상단 중앙: 아이콘 → 큰 타이틀 → 태그라인
  let y=64;
  { const img=ck.MakeImageFromEncoded(ICON); const ip=new ck.Paint(); ip.setAntiAlias(true);
    const ix=Math.round((W-iconSz)/2);
    cv.drawImageRect(img, ck.LTRBRect(0,0,512,512), ck.LTRBRect(ix,y,ix+iconSz,y+iconSz), ip); }
  y+=iconSz+16;
  const t=await T({text:"LG ThinQ Space Sentinel",fontPath:F_BOLD,size:96,color:GREEN,letter:-1.5,align:"center",pad:6});
  blit(cv,t.buffer,Math.round((W-t.width)/2),y,t.width,t.height); y+=t.height+10;
  const g=await T({text:tag,fontPath:F_SEMI,size:38,color:MUTED,align:"center",pad:4});
  blit(cv,g.buffer,Math.round((W-g.width)/2),y,g.width,g.height);
  sf.flush();await writeFile(`${OUT}/_${id}_txt.png`,Buffer.from(sf.makeImageSnapshot().encodeToBytes()));sf.delete();console.log("title",id);
}
await title("intro","요양병원 감염, 번지기 전에 공간이 먼저");
await title("outro","공간을 지키는, 가장 똑똑한 방법");
console.log("DONE titles");
