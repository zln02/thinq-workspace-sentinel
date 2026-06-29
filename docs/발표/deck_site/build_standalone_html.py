#!/usr/bin/env python3
"""Extract slide <section>s from the .dc.html web-component deck and emit a
self-contained standalone HTML viewer — no deck-stage.js / support.js / custom
elements needed. Opens directly (file:// or any static serve). Asset paths
(./assets/...) resolve because the output lives in the same folder."""
import re, os

SRC = "/home/ubuntu/thinq-workspace-sentinel/docs/발표/deck_site/Workspace Sentinel.dc.html"
OUT = "/home/ubuntu/thinq-workspace-sentinel/docs/발표/deck_site/Workspace_Sentinel_standalone.html"

html = open(SRC, encoding="utf-8").read()

# inner block = everything between the <x-import ...> open tag and </x-import>
m = re.search(r'<x-import\b[^>]*>(.*)</x-import>', html, re.S)
slides_html = m.group(1).strip()

# pull the cdn font link from <helmet> so the standalone keeps the same typeface
font = ('<link rel="stylesheet" '
        'href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">')

doc = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ThinQ Space Sentinel — 발표덱 (standalone)</title>
{font}
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; height:100%; background:#11161c; overflow:hidden;
    font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif; }}
  #stage {{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; }}
  #deck  {{ position:relative; width:1920px; height:1080px; transform-origin:center center;
    box-shadow:0 18px 60px rgba(0,0,0,.5); }}
  /* each authored slide -> a fixed 1920x1080 page, only the active one shown */
  #deck > section {{ position:absolute !important; inset:0 !important;
    width:1920px !important; height:1080px !important; margin:0 !important;
    overflow:hidden; display:none !important; }}
  #deck > section.active {{ display:flex !important; }}
  /* most authored slides set their own display via inline style; restore it */
  #bar {{ position:fixed; left:50%; bottom:14px; transform:translateX(-50%);
    background:rgba(20,28,22,.82); color:#fff; font:600 14px/1 'Pretendard',sans-serif;
    padding:9px 16px; border-radius:999px; display:flex; gap:14px; align-items:center;
    z-index:9; user-select:none; transition:opacity .3s; }}
  #bar.idle {{ opacity:0; }}
  #bar b {{ color:#DDB08F; }}
  #bar .k {{ color:rgba(255,255,255,.5); font-weight:500; }}
  #fsb {{ position:fixed; left:16px; bottom:16px; z-index:9;
    background:rgba(47,65,53,.88); color:#fff; font:600 14px/1 'Pretendard',sans-serif;
    padding:10px 15px; border-radius:999px; cursor:pointer; user-select:none; }}
  @media print {{
    html,body{{overflow:visible;background:#fff;}}
    #stage{{position:static;display:block;}}
    #deck{{transform:none!important;box-shadow:none;width:1920px;height:auto;}}
    #deck > section{{position:relative!important;display:flex!important;page-break-after:always;}}
    #bar,#fsb{{display:none;}}
  }}
</style>
</head>
<body>
<div id="stage"><div id="deck">
{slides_html}
</div></div>
<div id="fsb" onclick="fs()">⛶ 전체화면 · F</div>
<div id="bar"><span id="pos">1 / 1</span><span class="k">← → 이동 · F 전체화면 · P 인쇄</span></div>

<script>
const deck = document.getElementById('deck');
const slides = [...deck.querySelectorAll(':scope > section')];
let i = 0;
// honor each slide's authored inline display (flex/block) when active
slides.forEach(s => {{ s.dataset.disp = s.style.display || 'flex'; }});
function show(n){{
  i = Math.max(0, Math.min(slides.length-1, n));
  slides.forEach((s,k)=>{{
    if(k===i){{ s.classList.add('active'); s.style.display = s.dataset.disp; }}
    else {{ s.classList.remove('active'); s.style.display='none'; }}
  }});
  document.getElementById('pos').textContent = (i+1)+' / '+slides.length;
  location.hash = (i+1);
}}
function fit(){{
  const s = Math.min(innerWidth/1920, innerHeight/1080);
  deck.style.transform = 'scale('+s+')';
}}
function fs(){{ const d=document.documentElement;
  document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen&&d.requestFullscreen(); }}
addEventListener('keydown',e=>{{
  if(['ArrowRight','PageDown',' '].includes(e.key)){{ show(i+1); e.preventDefault(); }}
  else if(['ArrowLeft','PageUp'].includes(e.key)) show(i-1);
  else if(e.key==='Home') show(0);
  else if(e.key==='End') show(slides.length-1);
  else if(e.key==='f'||e.key==='F') fs();
}});
addEventListener('resize', fit);
addEventListener('hashchange', ()=>{{ const n=parseInt(location.hash.slice(1))-1; if(n>=0&&n!==i) show(n); }});
// idle-fade the hint bar
let t; const bar=document.getElementById('bar');
function ping(){{ bar.classList.remove('idle'); clearTimeout(t); t=setTimeout(()=>bar.classList.add('idle'),2600); }}
addEventListener('mousemove',ping); addEventListener('keydown',ping);
fit();
const start = parseInt(location.hash.slice(1))-1;
show(start>=0?start:0);
ping();
</script>
</body>
</html>"""

open(OUT, "w", encoding="utf-8").write(doc)
print("slides:", len(re.findall(r'<section\b', slides_html)), "(incl. nested)")
print("saved:", OUT, f"({os.path.getsize(OUT)/1024:.0f} KB)")
