#!/usr/bin/env python3
"""Space Sentinel — PPTX Generator (python-pptx native elements)"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.oxml import parse_xml
from lxml import etree
import os, copy

ASSETS = "/home/ubuntu/thinq-workspace-sentinel/docs/발표/deck_site/assets"
OUT    = "/home/ubuntu/thinq-workspace-sentinel/docs/발표/deck_site/Workspace_Sentinel.pptx"

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

# ── Color palette ──────────────────────────────────────────────
DG = RGBColor(0x2F,0x41,0x35)   # dark green
RU = RGBColor(0xB0,0x5F,0x3B)   # rust
BE = RGBColor(0xEC,0xE4,0xD6)   # beige
CR = RGBColor(0xF4,0xEE,0xE3)   # cream
AM = RGBColor(0xDD,0xB0,0x8F)   # amber
GA = RGBColor(0x7E,0xC8,0xA4)   # green accent
TE = RGBColor(0x3A,0x4F,0x42)   # teal
WH = RGBColor(0xFF,0xFF,0xFF)
GR = RGBColor(0xA8,0x9F,0x90)   # muted gray
DT = RGBColor(0x6E,0x67,0x5C)   # body text
N2 = RGBColor(0x3A,0x46,0x3C)   # near-black green

W, H = 13.33, 7.5

# ── Helpers ────────────────────────────────────────────────────
def new_slide():
    return prs.slides.add_slide(BLANK)

def bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def rect(slide, x, y, w, h, fill=None, line=None, lw=0.5, radius=0):
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx.util import Pt as Ptt
    shape = slide.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill:
        shape.fill.solid(); shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if line:
        shape.line.color.rgb = line; shape.line.width = Ptt(lw)
    else:
        shape.line.fill.background()
    return shape

def txt(slide, text, x, y, w, h, size=16, bold=False, color=WH,
        align=PP_ALIGN.LEFT, italic=False, wrap=True):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf  = box.text_frame
    tf.word_wrap = wrap
    p   = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.italic= italic
    run.font.color.rgb = color
    return box

def img(slide, path, x, y, w, h):
    if os.path.exists(path):
        slide.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))

def full_img(slide, path):
    img(slide, path, 0, 0, W, H)

def header(slide, badge, badge_bg, label, right=None):
    """Standard slide header row"""
    # Badge box
    r = rect(slide, 0.58, 0.41, 0.60, 0.38, fill=badge_bg)
    txt(slide, badge, 0.60, 0.43, 0.56, 0.34, size=15, bold=True, color=WH, align=PP_ALIGN.CENTER)
    # Label
    txt(slide, label, 1.28, 0.44, 6.5, 0.32, size=15, bold=False, color=GR)
    # Right badge
    if right:
        rb = rect(slide, 10.60, 0.41, 2.30, 0.37, fill=BE)
        txt(slide, right, 10.62, 0.43, 2.26, 0.33, size=14, bold=False, color=DG, align=PP_ALIGN.CENTER)

def h2(slide, text, y=0.95):
    txt(slide, text, 0.58, y, 12.15, 0.70, size=30, bold=True, color=DG, wrap=True)

def sub(slide, text, y=1.62):
    txt(slide, text, 0.58, y, 12.15, 0.36, size=16, bold=False, color=DT)

def footer(slide):
    txt(slide, "LG DX School", 11.0, 7.0, 2.2, 0.36, size=14, bold=False, color=GR, align=PP_ALIGN.RIGHT)

def card(slide, x, y, w, h, fill, line=None):
    return rect(slide, x, y, w, h, fill=fill, line=line, lw=0.5)

def hbar(slide, x, y, w, h, pct, track_color, fill_color, label, val_text, label_color=WH, val_color=AM):
    """Horizontal bar with label + value"""
    txt(slide, label, x, y, w*0.55, 0.22, size=13, color=label_color)
    txt(slide, val_text, x+w*0.55, y, w*0.45, 0.22, size=13, bold=True, color=val_color, align=PP_ALIGN.RIGHT)
    bar_y = y + 0.24
    rect(slide, x, bar_y, w, h, fill=track_color)
    if pct > 0:
        rect(slide, x, bar_y, w * pct, h, fill=fill_color)

def kw_bar(slide, x, y, w, h, pct, fill_color, text, count_text, text_color=WH, count_color=DT):
    """Keyword bar row with inline label"""
    rect(slide, x, y, w, h, fill=RGBColor(0xF0,0xEB,0xE2))
    if pct > 0:
        rect(slide, x, y, w * pct, h, fill=fill_color)
    txt(slide, text, x+0.06, y+0.02, w*0.5, h-0.04, size=12, bold=True, color=text_color)
    txt(slide, count_text, x+w*0.5, y+0.02, w*0.5-0.05, h-0.04, size=12, color=count_color, align=PP_ALIGN.RIGHT)

# ══════════════════════════════════════════════════════════════
# 00 · 표지 (Cover)
# ══════════════════════════════════════════════════════════════
sl = new_slide()
full_img(sl, f"{ASSETS}/cover.png")
prs.slides[-1]._element.attrib['show'] = '1' if False else prs.slides[-1]._element.attrib.get('show','')

# ══════════════════════════════════════════════════════════════
# 01 · 목차
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
txt(sl,"목차",0.58,0.38,12,0.65,size=42,bold=True,color=DG)
items = [
    ("BX","시장 기회 발견  →  P0 WBS · P1 시장공백 · P2 경쟁분석 · P3 데이터·방법론"),
    ("CX","경험 설계  →  P4 페르소나 · P5 CAM · P6 컨셉"),
    ("DX","기술 구현  →  P7 설계 · P8 구현검증 · P9 성과"),
]
cy = 1.5
for badge, desc in items:
    r = rect(sl, 0.58, cy, 0.55, 0.42, fill=RU)
    txt(sl, badge, 0.60, cy+0.02, 0.51, 0.38, size=16, bold=True, color=WH, align=PP_ALIGN.CENTER)
    txt(sl, desc, 1.25, cy+0.05, 11.0, 0.38, size=16, color=DT)
    cy += 0.80

# ══════════════════════════════════════════════════════════════
# 02 · BX Divider
# ══════════════════════════════════════════════════════════════
sl = new_slide()
full_img(sl, f"{ASSETS}/bx_divider.png")

# ══════════════════════════════════════════════════════════════
# 03 · P0 · WBS
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P0","#2F4135" and DG,"BX · WBS","4주 스프린트")
h2(sl,"4주 Sprint — 주차별 핵심 산출물")
sub(sl,"BX→CX→DX 순서로 진행, 각 주차 종료 시 산출물 확정")
cols=[("1주차\nBX","시장공백 발견\n경쟁분석\n데이터 수집"),
      ("2주차\nCX","페르소나 설계\nCAM 분석\n경험 컨셉"),
      ("3주차\nDX","시스템 설계\n구현·테스트\n검증"),
      ("4주차\n통합","성과 측정\n사업화 계획\n발표 준비")]
fills=[DG,TE,RU,AM]
tcol=[WH,WH,WH,DG]
cx=0.58
for i,(title,desc) in enumerate(cols):
    c=card(sl,cx,2.0,2.88,4.8,fill=fills[i])
    txt(sl,title,cx+0.15,2.1,2.58,0.70,size=18,bold=True,color=tcol[i])
    txt(sl,desc,cx+0.15,2.90,2.58,2.8,size=14,color=tcol[i],wrap=True)
    cx+=3.04

# ══════════════════════════════════════════════════════════════
# 04 · BX 가전 레드오션
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"BX","#B05F3B" and RU,"BX · 가전 레드오션")
h2(sl,"가전은 이미 레드오션 — LG는 SaaS로 돌파한다")
sub(sl,"하드웨어 마진 압박 · 구독/데이터 서비스로 수익 다각화 · B2B SaaS 공백 선점")
for i,(label,val,col) in enumerate([("글로벌 스마트홈 시장","$174B (2030E)",DG),
                                      ("LG ThinQ 가입자","6천만+ 가구",TE),
                                      ("B2B SaaS 침투율","< 3%",RU)]):
    cx2 = 0.58 + i*4.27
    c=card(sl,cx2,2.1,3.9,4.6,fill=BE)
    txt(sl,label,cx2+0.2,2.3,3.5,0.5,size=15,color=DT)
    txt(sl,val,cx2+0.2,3.0,3.5,0.9,size=28,bold=True,color=col)

# ══════════════════════════════════════════════════════════════
# 05 · P1 · 연결·구독
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 연결·구독 서비스 현황","시장 기회")
h2(sl,"ThinQ 연결 → 구독 → SaaS — 3단계 수익 전환")
sub(sl,"단순 기기 판매에서 연결·구독·서비스로 수익 구조 전환 중")
stages=[("SELL\n하드웨어","기기 판매 마진\n압박 증가",DG,WH),
        ("CONNECT\nThinQ","6천만 가구 연결\nIoT 데이터 축적",TE,WH),
        ("SUBSCRIBE\n구독","케어 서비스\n월정액 모델",RU,WH),
        ("SaaS\nB2B","기관·기업 대상\n공백 영역 ★",AM,DG)]
cx=0.58
for label,desc,fc,tc in stages:
    c=card(sl,cx,2.0,2.85,4.7,fill=fc)
    txt(sl,label,cx+0.15,2.15,2.55,0.90,size=17,bold=True,color=tc)
    txt(sl,desc,cx+0.15,3.15,2.55,1.5,size=14,color=tc,wrap=True)
    if cx<11:
        txt(sl,"→",cx+2.92,3.4,0.25,0.4,size=20,bold=True,color=RU)
    cx+=3.01

# ══════════════════════════════════════════════════════════════
# 06 · BX 그래서 SaaS
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"BX",RU,"BX · 그래서 SaaS")
h2(sl,"'그래서' SaaS — B2B 공백을 선점해야 하는 이유")
sub(sl,"B2C 포화 → B2B SaaS 전환이 LG의 다음 성장 벡터")
for i,(pt,desc) in enumerate([
    ("B2C 포화","스마트홈 기기 보급률 정체·마진 압박"),
    ("B2B 미개척","요양·의료·물류 등 기관 IoT 수요 급증"),
    ("SaaS 공백","ThinQ 기반 B2B SaaS 플랫폼 전무"),
    ("선점 기회","지금 진입하면 5년 선도 가능"),
]):
    cy2=2.0+i*1.15
    r=rect(sl,0.58,cy2,0.38,0.38,fill=RU)
    txt(sl,str(i+1),0.60,cy2+0.02,0.34,0.34,size=16,bold=True,color=WH,align=PP_ALIGN.CENTER)
    txt(sl,pt,1.10,cy2+0.02,2.2,0.34,size=16,bold=True,color=DG)
    txt(sl,desc,3.5,cy2+0.02,9.3,0.34,size=15,color=DT)

# ══════════════════════════════════════════════════════════════
# 07 · P1 · 통합공백
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 통합 공백 분석","시장 기회")
h2(sl,"환경·안전·기록 — 3개 축 동시 해결 공백")
sub(sl,"경쟁사 어디도 3개 축을 하나의 플랫폼으로 묶지 못했다")
axes=[("환경 모니터링","공기질·온도·냄새\n실시간 감지",DG),
      ("안전 이벤트","낙상·욕창·감염\n자동 감지·대응",RU),
      ("디지털 기록","8,640건/년 자동\n증빙 생성",TE)]
cx=0.58
for label,desc,fc in axes:
    c=card(sl,cx,2.1,3.88,4.6,fill=fc)
    txt(sl,label,cx+0.2,2.3,3.48,0.55,size=19,bold=True,color=WH)
    txt(sl,desc,cx+0.2,3.0,3.48,1.5,size=15,color=WH,wrap=True)
    cx+=4.05

# ══════════════════════════════════════════════════════════════
# 08 · P1 · 안전 공백
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 안전 공백","근거")
h2(sl,"요양병원 안전 — 데이터가 말하는 공백")
sub(sl,"냄새·낙상·욕창·감염 — 4개 핵심 Safety Issue 동시 미해결")
stats=[("낙상 사고","2,969건/키워드 언급",RU),
       ("욕창 발생","2,979건/키워드 언급",RU),
       ("집단감염","부정도 99.3%",DG),
       ("냄새 민원","3,001건 최다 빈도",AM)]
cx=0.58
for label,val,fc in stats:
    c=card(sl,cx,2.1,2.85,4.6,fill=fc)
    txt(sl,label,cx+0.2,2.3,2.45,0.55,size=18,bold=True,color=WH)
    txt(sl,val,cx+0.2,3.2,2.45,0.9,size=14,color=WH,wrap=True)
    cx+=3.02

# ══════════════════════════════════════════════════════════════
# 09 · P1 · 근거
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 근거","데이터 기반")
h2(sl,"요양병원 Pain — 직접 크롤링 75,633건 근거")
sub(sl,"종사자 부정도 84.0% · 집단감염 99.3% · 욕창 98.2% — 측정값")
for i,(kw,neg,n) in enumerate([
    ("집단감염","99.3%","n=1,938"),
    ("욕창","98.2%","n=2,972"),
    ("야간근무","97.0%","n=2,780"),
    ("폐업","96.3%","n=1,205"),
    ("행정처분","96.0%","n=1,012"),
]):
    cy2=2.0+i*0.95
    rect(sl,0.58,cy2,9.0,0.82,fill=BE)
    txt(sl,kw,0.75,cy2+0.12,2.5,0.58,size=17,bold=True,color=DG)
    txt(sl,n,3.4,cy2+0.12,2.0,0.58,size=14,color=DT)
    rect(sl,5.5,cy2+0.22,6.0*0.12,0.38,fill=BE)
    pct=float(neg.replace('%',''))/100
    rect(sl,5.5,cy2+0.22,6.0*pct,0.38,fill=RU)
    txt(sl,neg,11.7,cy2+0.18,0.9,0.45,size=18,bold=True,color=RU,align=PP_ALIGN.RIGHT)

# ══════════════════════════════════════════════════════════════
# 10 · P1 · 요양병원
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 요양병원 시장","시장 규모")
h2(sl,"요양병원 · 요양원 — 급성장 규모·규제 동시 도래")
sub(sl,"2026 의무 인증 평가 → 디지털 증빙 수요 폭증")
for i,(label,val,sub2,fc) in enumerate([
    ("국내 요양병원","1,527개","2023 기준",DG),
    ("요양원(노인요양시설)","3,712개","2023 기준",TE),
    ("인증 의무화","2026년","전 기관 대상",RU),
    ("디지털 기록 수요","급증","규제 대응",AM),
]):
    cx2=0.58+i*3.21
    c=card(sl,cx2,2.1,2.9,4.6,fill=fc)
    txt(sl,label,cx2+0.18,2.25,2.54,0.55,size=14,color=WH)
    txt(sl,val,cx2+0.18,2.95,2.54,0.90,size=26,bold=True,color=WH)
    txt(sl,sub2,cx2+0.18,3.95,2.54,0.45,size=13,color=WH)

# ══════════════════════════════════════════════════════════════
# 11 · P1 · 시장 규모
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P1",DG,"BX · 시장 규모","TAM/SAM/SOM")
h2(sl,"TAM $2.4B → SAM $480M → SOM $48M — 3년 목표")
sub(sl,"요양·의료기관 IoT 모니터링 SaaS 시장 추정치")
for i,(label,val,desc,fc) in enumerate([
    ("TAM","$2.4B","전체 요양·의료 IoT 시장",DG),
    ("SAM","$480M","국내 요양기관 SaaS 침투 가능 시장",TE),
    ("SOM","$48M","3년 내 점유 목표 (SAM 10%)",RU),
]):
    cx2=0.58+i*4.27
    c=card(sl,cx2,2.1,3.9,4.6,fill=fc)
    txt(sl,label,cx2+0.2,2.28,3.5,0.48,size=19,bold=True,color=WH)
    txt(sl,val,cx2+0.2,2.90,3.5,0.90,size=30,bold=True,color=AM)
    txt(sl,desc,cx2+0.2,3.90,3.5,0.70,size=13,color=WH,wrap=True)

# ══════════════════════════════════════════════════════════════
# 12 · P2 · 목표
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P2",RU,"BX · 경쟁 분석","포지셔닝")
h2(sl,"Sentinel의 포지션 — 3개 축 통합 유일")
sub(sl,"환경+안전+기록 3축 동시 해결 — 경쟁사 없음")
for i,(comp,env,safe,rec,note) in enumerate([
    ("Sentinelle","○","○","○","★ Space Sentinel"),
    ("Samsung SmartThings","○","△","✗","환경만"),
    ("LG전자 ThinQ","○","✗","✗","기기 연결만"),
    ("다우기술 CareNote","✗","△","○","기록만"),
    ("에이콘","✗","○","△","안전만"),
]):
    cy2=2.0+i*0.95
    fc2=DG if i==0 else BE
    tc2=WH if i==0 else DT
    rect(sl,0.58,cy2,12.15,0.82,fill=fc2)
    txt(sl,comp,0.75,cy2+0.14,3.5,0.55,size=15,bold=(i==0),color=tc2)
    for j,val in enumerate([env,safe,rec]):
        vc=DG if val=="○" else (AM if val=="△" else GR)
        vc2=GA if (i==0 and val=="○") else vc
        txt(sl,val,4.5+j*2.5,cy2+0.14,1.5,0.55,size=18,bold=True,color=vc2,align=PP_ALIGN.CENTER)
    txt(sl,note,10.2,cy2+0.14,2.35,0.55,size=13,color=AM if i==0 else DT)

# ══════════════════════════════════════════════════════════════
# 13 · P3 · 데이터
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P3",DG,"BX · 데이터 수집","N=75,633")
h2(sl,"78,087건 직접 수집 → 75,633건 분석")
sub(sl,"네이버 API · 4채널 · 51키워드 · 5페르소나 — 전 건 재현 가능")
for i,(label,val,sub2,fc) in enumerate([
    ("수집 건수","78,087건","raw.csv",DG),
    ("분석 건수","75,633건","필터 후",TE),
    ("키워드","51개","도메인 선정",RU),
    ("페르소나","5개","staff·manager·family·competitor·policy",AM),
]):
    cx2=0.58+i*3.21
    c=card(sl,cx2,2.1,2.90,4.6,fill=fc)
    txt(sl,label,cx2+0.18,2.25,2.54,0.50,size=14,color=WH)
    txt(sl,val,cx2+0.18,2.88,2.54,0.88,size=26,bold=True,color=WH)
    txt(sl,sub2,cx2+0.18,3.90,2.54,0.65,size=13,color=WH,wrap=True)

# ══════════════════════════════════════════════════════════════
# 14 · P3 · 크롤링 (NEW)
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P3",RU,"BX · 크롤링 & 키워드 분석","전 건 재현 가능")
h2(sl,"78,087건 · 5 페르소나 · 4채널 — 직접 수집한 데이터")
sub(sl,"네이버 API · Python requests + BeautifulSoup · 전 건 재현 가능")
CX,CY,CW,CH=0.58,2.10,3.72,4.60
# Card 1: 채널별 수집량
c=card(sl,CX,CY,CW,CH,fill=DG)
txt(sl,"채널별 수집량",CX+0.18,CY+0.18,CW-0.36,0.32,size=14,bold=True,color=AM)
ch_data=[("뉴스",26696,1.0),("블로그",22745,0.852),("카페",20097,0.753),("지식iN",8549,0.320)]
for j,(ch,cnt,pct) in enumerate(ch_data):
    ry=CY+0.62+j*0.82
    txt(sl,ch,CX+0.18,ry,1.6,0.25,size=13,color=WH)
    txt(sl,f"{cnt:,}건",CX+0.18,ry,CW-0.36,0.25,size=13,bold=True,color=AM,align=PP_ALIGN.RIGHT)
    rect(sl,CX+0.18,ry+0.27,CW-0.36,0.16,fill=RGBColor(0xFF,0xFF,0xFF) if False else RGBColor(0x4A,0x60,0x52))
    rect(sl,CX+0.18,ry+0.27,(CW-0.36)*pct,0.16,fill=AM)
txt(sl,"78,087",CX+0.18,CY+3.85,1.6,0.52,size=24,bold=True,color=WH)
txt(sl,"건 수집",CX+1.88,CY+3.98,1.2,0.35,size=13,color=RGBColor(0xCC,0xCC,0xCC))

# Card 2: 페르소나별 부정도
C2X=CX+3.88
c2=card(sl,C2X,CY,CW,CH,fill=BE)
txt(sl,"페르소나별 부정도",C2X+0.18,CY+0.18,CW-0.36,0.32,size=14,bold=True,color=RU)
pdata=[("종사자 (staff)",0.840,RU),("정책·제도 (policy)",0.795,RU),
       ("시설장·관리자",0.665,RU),("가족·보호자",0.552,DG),("경쟁사 언급",0.155,GR)]
for j,(label,pct,fc3) in enumerate(pdata):
    ry=CY+0.62+j*0.72
    txt(sl,label,C2X+0.18,ry,2.5,0.22,size=12,color=N2)
    pct_txt=f"{pct*100:.1f}%"
    txt(sl,pct_txt,C2X+0.18,ry,CW-0.36,0.22,size=13,bold=True,color=fc3,align=PP_ALIGN.RIGHT)
    rect(sl,C2X+0.18,ry+0.24,(CW-0.36),0.14,fill=RGBColor(0xD5,0xCC,0xC0))
    rect(sl,C2X+0.18,ry+0.24,(CW-0.36)*pct,0.14,fill=fc3)

# Card 3: Top 키워드
C3X=C2X+3.88
c3=card(sl,C3X,CY,CW,CH,fill=BE)
txt(sl,"Top 키워드 빈도",C3X+0.18,CY+0.18,CW-0.36,0.32,size=14,bold=True,color=DG)
kws=[("냄새",3001,1.00,RU),("인증평가",2985,0.995,RU),("욕창",2979,0.993,RU),
     ("인력부족",2976,0.992,DG),("부모님후회",2975,0.992,DG),
     ("낙상사고",2969,0.990,DG),("면회제한",2923,0.974,TE),
     ("야간근무",2869,0.956,TE),("공기청정기",2759,0.919,AM),("힘들다",2187,0.729,GR)]
for j,(kw,cnt,pct,fc3) in enumerate(kws):
    ry=CY+0.60+j*0.38
    rect(sl,C3X+0.30,ry,(CW-0.48)*pct,0.30,fill=fc3)
    txt(sl,kw,C3X+0.36,ry+0.02,1.4,0.26,size=11,bold=True,color=WH)
    txt(sl,f"{cnt:,}",C3X+0.18,ry+0.05,CW-0.26,0.20,size=11,color=DT,align=PP_ALIGN.RIGHT)

# ══════════════════════════════════════════════════════════════
# 15 · P3 · 방법론
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P3+",RU,"BX · 분석 방법론 (Show your work)","신뢰성")
h2(sl,"주장이 아니라 재현됩니다 — 크롤러·데이터·코드 공개")
sub(sl,"저장소의 스크립트를 그대로 돌리면 같은 숫자가 나옵니다 (N=75,633)")
cards=[("① 토픽 자동 분리","LDA 5토픽\nT1 욕창·재활 / T2 인력·수가\nT3 인증·행정 / T4 감염·낙상\nT5 야간·교대",BE),
       ("② 감정 측정","도메인 룰 사전\n부정어 37개 / 긍정어 16개\n한국어 BERT 대신 해석 가능한 룰",BE),
       ("③ 재현된 부정도","종사자 84.0%\n집단감염 99.3%\n욕창 98.2% / 야간근무 97.0%",DG)]
cx=0.58
for title,desc,fc3 in cards:
    c=card(sl,cx,2.2,3.88,4.5,fill=fc3)
    tc3=DG if fc3==BE else WH
    txt(sl,title,cx+0.2,2.38,3.48,0.45,size=15,bold=True,color=RU if fc3==BE else AM)
    txt(sl,desc,cx+0.2,2.95,3.48,2.5,size=14,color=tc3,wrap=True)
    cx+=4.05

# ══════════════════════════════════════════════════════════════
# 16 · CX Divider
# ══════════════════════════════════════════════════════════════
sl = new_slide()
full_img(sl, f"{ASSETS}/cx_divider.png")

# ══════════════════════════════════════════════════════════════
# 17 · P3+ · 전처리 파이프라인 (NEW)
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P3+",RU,"CX · 데이터 전처리 파이프라인","Kiwi NLP · LDA 토픽 수 결정")
h2(sl,"78,087건 → 75,633건 — 단계별 정제 후 LDA 투입")
sub(sl,"HTML 제거 · 중복 필터 · Kiwi 형태소 분석 · CountVectorizer · 감정 사전 적용")
# 5-step pipeline
steps=[("STEP 1\n수집","78,087건\n4채널×51키워드",DG,WH,AM),
       ("STEP 2\n정제","HTML제거\n중복·단문 제거",BE,DG,DG),
       ("STEP 3\n형태소","Kiwi NLP\nNNG·NNP 추출",BE,DG,DG),
       ("STEP 4\n불용어","CountVectorizer\nmax_features=500",BE,DG,DG),
       ("STEP 5\n감정사전","부정어37\n긍정어16",RU,WH,WH)]
arrow_x=[2.40,4.42,6.44,8.46]
cx=0.58
for i,(title,desc,fc3,tc3,vc3) in enumerate(steps):
    c=card(sl,cx,2.1,1.88,1.60,fill=fc3)
    txt(sl,title,cx+0.1,2.15,1.68,0.50,size=12,bold=True,color=vc3,align=PP_ALIGN.CENTER)
    txt(sl,desc,cx+0.1,2.70,1.68,0.85,size=11,color=tc3,align=PP_ALIGN.CENTER,wrap=True)
    if i<4:
        txt(sl,"→",cx+1.90,2.72,0.28,0.35,size=16,bold=True,color=RU,align=PP_ALIGN.CENTER)
    cx+=2.12
# LDA Perplexity chart (simplified as bars)
card(sl,0.58,3.88,6.40,3.22,fill=DG)
txt(sl,"Perplexity + Coherence — 최적 토픽 수 탐색",0.76,3.98,6.04,0.35,size=13,bold=True,color=AM)
# bars for perplexity (n=3~11)
perp_vals=[(-7.48,0.470),(-7.46,0.483),(-7.51,0.488),(-7.60,0.430),
           (-7.60,0.472),(-7.62,0.472),(-7.64,0.463),(-7.65,0.430),(-7.80,0.437)]
chart_x=0.76; chart_w=6.04; chart_h=2.30; chart_y=4.40
bar_w=(chart_w-0.20)/9
for j,(pv,cv) in enumerate(perp_vals):
    bx=chart_x+j*(bar_w+0.03)
    p_norm=(-7.44-pv)/0.38
    c_norm=(cv-0.42)/0.08
    bar_h_p=p_norm*chart_h*0.9
    bar_h_c=c_norm*chart_h*0.9
    fc_bar=AM if j==2 else RGBColor(0x55,0x73,0x60)
    fc_coh=GA if j==2 else RGBColor(0x55,0x88,0x70)
    rect(sl,bx,chart_y+chart_h-bar_h_p,bar_w*0.45,bar_h_p,fill=fc_bar)
    rect(sl,bx+bar_w*0.47,chart_y+chart_h-bar_h_c,bar_w*0.45,bar_h_c,fill=fc_coh)
    n_label=str(j+3)
    txt(sl,n_label,bx,chart_y+chart_h+0.05,bar_w,0.22,size=10,color=RGBColor(0xCC,0xCC,0xCC),align=PP_ALIGN.CENTER)
txt(sl,"n=5 최적 (Coherence 기준)",0.76,6.80,6.04,0.22,size=12,color=AM)
# LDA 5 topics
card(sl,7.16,3.88,5.57,3.22,fill=BE)
txt(sl,"LDA 5토픽 — 데이터가 스스로 나눈 결과",7.30,3.98,5.28,0.32,size=13,bold=True,color=RU)
topics=[("T1 · 가족·돌봄","욕창·치료·면회·재활·입원·부모·치매",RU),
        ("T2 · 경영·인력난","인력·부족·수가·폐업·학대·간병",TE),
        ("T3 · 행정·인증","인증·평가·청구·급여·처분·행정",GR),
        ("T4 · 감염·안전","감염·관리·코로나·예방·집단·낙상",DG),
        ("T5 · 야간·근무","근무·보호사·야간·교대·산재·수당",GA)]
for j,(title,kws,fc3) in enumerate(topics):
    ty=4.40+j*0.55
    rect(sl,7.30,ty,5.28,0.48,fill=WH)
    rect(sl,7.30,ty,0.06,0.48,fill=fc3)
    tc3=WH if fc3==DG else (DG if fc3==GA else fc3)
    txt(sl,title,7.42,ty+0.02,2.0,0.22,size=12,bold=True,color=fc3)
    txt(sl,kws,7.42,ty+0.24,5.08,0.20,size=11,color=DT)

# ══════════════════════════════════════════════════════════════
# 18 · P4 · 페르소나 (4명)
# ══════════════════════════════════════════════════════════════
sl = new_slide(); bg(sl, CR); footer(sl)
header(sl,"P4",DG,"CX · 4대 페르소나","Pain Point")
h2(sl,"4개 페르소나 — 각자의 Pain을 직접 크롤링으로 확인")
sub(sl,"staff 84% · policy 79.5% · manager 66.5% · family 55.2% 부정도")
personas=[
    ("병원장\n(관리자)","66.5%\n부정도","인증평가 대응\n인력 부족 관리",DG,f"{ASSETS}/병원장1.png"),
    ("간호사\n(종사자)","84.0%\n부정도","야간근무 과부하\n욕창·낙상 사고",RU,f"{ASSETS}/간호사1.png"),
    ("보호자\n(family)","55.2%\n부정도","면회 제한\n부모님 상태 불안",TE,f"{ASSETS}/보호자1.png"),
    ("정책\n(policy)","79.5%\n부정도","인증 의무화\n행정처분 위험",AM,f"{ASSETS}/시설관리자1.png"),
]
cx=0.58
for name,neg,pain,fc3,img_path in personas:
    c=card(sl,cx,2.2,2.88,4.8,fill=fc3)
    tc3=WH if fc3 in [DG,RU,TE] else DG
    if os.path.exists(img_path):
        img(sl,img_path,cx+0.1,2.3,2.68,1.50)
    txt(sl,name,cx+0.15,3.92,2.58,0.55,size=16,bold=True,color=tc3)
    txt(sl,neg,cx+0.15,4.55,2.58,0.48,size=14,bold=True,color=AM if fc3!=AM else DG)
    txt(sl,pain,cx+0.15,5.10,2.58,0.80,size=13,color=tc3,wrap=True)
    cx+=3.05

# ══════════════════════════════════════════════════════════════
# 19~21 · P4+A/B/C LDA 슬라이드
# ══════════════════════════════════════════════════════════════
lda_slides=[
    ("P4+","CX · 병원장 LDA","병원장 Pain — LDA 토픽 분석","인력난·수가·행정처분 3개 토픽 집중",
     [("인력·수가","인력부족·수가인상·폐업위기",RU),("행정처분","인증평가·행정처분·급여청구",DG),("경영난","간병·운영비·수익",TE)]),
    ("P4+B","CX · 시설관리자 LDA","시설관리자 Pain — LDA 토픽","환경·냄새·설비 3개 토픽 집중",
     [("환경관리","냄새·공기질·환경오염",DG),("설비","기기고장·유지보수·비용",TE),("인증","평가·기준·서류",RU)]),
    ("P4+C","CX · 간호사 LDA","간호사 Pain — LDA 토픽","야간근무·안전·감염 토픽",
     [("야간근무","야간·교대·수당·과로",RU),("안전사고","욕창·낙상·감염·사고",DG),("감정소진","힘들다·그만두고싶다·번아웃",TE)]),
]
for badge,label,title,subline,topics2 in lda_slides:
    sl=new_slide(); bg(sl,CR); footer(sl)
    header(sl,badge,DG,label,"LDA 토픽")
    h2(sl,title); sub(sl,subline)
    cx=0.58
    for t,desc,fc3 in topics2:
        c=card(sl,cx,2.2,3.88,4.8,fill=fc3)
        txt(sl,t,cx+0.2,2.38,3.48,0.55,size=18,bold=True,color=WH)
        txt(sl,desc,cx+0.2,3.10,3.48,1.5,size=14,color=WH,wrap=True)
        cx+=4.05

# ══════════════════════════════════════════════════════════════
# 22 · P4+D · 핵심 경험 컨셉
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P4+D",DG,"CX · 핵심 경험 컨셉","How Might We")
h2(sl,"HMW — 4 페르소나의 Pain을 하나의 컨셉으로")
sub(sl,"\"요양병원 종사자와 가족이 안심할 수 있도록 — 공간이 스스로 지킨다\"")
for i,(persona,hmw,fc3) in enumerate([
    ("병원장","인증 증빙을 자동으로 생성하여 행정 부담 제로",DG),
    ("간호사","위험 상황을 1초 이내 감지해 야간 혼자도 안전",RU),
    ("보호자","실시간으로 부모님 상태를 확인해 불안 해소",TE),
    ("정책담당","규정 준수를 자동 기록해 감사에 바로 대응",AM),
]):
    cy2=2.1+i*1.05
    r=rect(sl,0.58,cy2,0.42,0.42,fill=fc3)
    txt(sl,persona,0.60,cy2+0.04,0.38,0.34,size=13,bold=True,color=WH,align=PP_ALIGN.CENTER)
    txt(sl,hmw,1.12,cy2+0.06,11.5,0.34,size=15,color=DT)

# ══════════════════════════════════════════════════════════════
# 23 · P5 · CAM
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P5",RU,"CX · CAM 분석","기회존")
h2(sl,"Customer Activity Map — 기회존 발굴")
sub(sl,"종사자·보호자 여정에서 Sentinel이 개입할 수 있는 접점")
img(sl,f"{ASSETS}/LDA예시.png",0.58,2.0,12.15,4.8) if False else None
for i,(step,issue,opp) in enumerate([
    ("입소","서류·인증 준비","자동 증빙 생성"),
    ("일상케어","야간 안전 불안","1초 이내 감지·알림"),
    ("면회","상태 공유 부재","보호자 앱 실시간 공유"),
    ("응급","대응 지연","자동 알림·기록"),
]):
    cx2=0.58+i*3.21
    r=rect(sl,cx2,2.2,2.90,1.00,fill=DG)
    txt(sl,step,cx2+0.15,2.32,2.60,0.38,size=16,bold=True,color=AM)
    r2=rect(sl,cx2,3.32,2.90,1.20,fill=BE)
    txt(sl,issue,cx2+0.15,3.42,2.60,0.80,size=14,color=DT,wrap=True)
    r3=rect(sl,cx2,4.64,2.90,1.20,fill=TE)
    txt(sl,opp,cx2+0.15,4.74,2.60,0.80,size=14,color=WH,wrap=True)

# ══════════════════════════════════════════════════════════════
# 24 · P6 · 컨셉
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P6",RU,"CX · 경험 컨셉","Value Proposition")
h2(sl,"Space Sentinel — 공간이 스스로 지킨다")
sub(sl,"환경·안전·기록 3축을 하나의 플랫폼으로 통합")
rect(sl,0.58,2.15,12.15,4.65,fill=DG)
txt(sl,"\"요양병원 종사자와 가족이 안심할 수 있도록\n공간이 스스로 위험을 감지하고, 대응하고, 기록합니다\"",
    0.80,2.50,11.73,1.40,size=24,bold=True,color=WH,wrap=True,align=PP_ALIGN.CENTER)
for i,(icon,label,desc) in enumerate([
    ("◉","환경 모니터링","공기질·온도·냄새 실시간"),
    ("◎","안전 자동대응","위험 감지 → 즉시 알림"),
    ("◈","디지털 증빙","8,640건/년 자동 기록"),
]):
    cx2=1.20+i*3.75
    txt(sl,icon,cx2,4.20,0.50,0.50,size=24,color=AM,align=PP_ALIGN.CENTER)
    txt(sl,label,cx2+0.55,4.22,2.80,0.38,size=16,bold=True,color=AM)
    txt(sl,desc,cx2+0.55,4.65,2.80,0.35,size=14,color=WH)

# ══════════════════════════════════════════════════════════════
# 25 · DX Divider
# ══════════════════════════════════════════════════════════════
sl=new_slide()
full_img(sl,f"{ASSETS}/dx_divider.png")

# ══════════════════════════════════════════════════════════════
# 26 · P7 · 설계
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P7",DG,"DX · 시스템 설계","4-Stage")
h2(sl,"위험 인지 → 자동 대응 → 증빙 기록 → 보호자 안심")
sub(sl,"4개 사용자 시나리오 · FR 8개 · 화면 6개 · 분석 3축")
scenarios=[("STEP 1\n위험인지","Dashboard\n<5초 감지",DG,AM),
           ("STEP 2\n자동대응","84건 처리\n알림·기록",RU,WH),
           ("STEP 3\n증빙기록","8,640건/년\n자동 생성",TE,WH),
           ("STEP 4\n보호자안심","100% 공유\n앱 실시간",RGBColor(0xEC,0xE4,0xD6),DG)]
cx=0.58
for title,desc,fc3,tc3 in scenarios:
    c=card(sl,cx,2.2,2.85,1.95,fill=fc3)
    tc2=tc3 if isinstance(tc3,RGBColor) else WH
    fc2=fc3 if isinstance(fc3,RGBColor) else DG
    txt(sl,title,cx+0.15,2.30,2.55,0.60,size=15,bold=True,color=AM if fc3==DG else (DG if fc3==BE else WH))
    txt(sl,desc,cx+0.15,2.95,2.55,0.90,size=13,color=DG if fc3==BE else WH,wrap=True)
    cx+=3.01
# Architecture
rect(sl,0.58,4.30,12.15,2.95,fill=RGBColor(0xEB,0xE3,0xD5))
txt(sl,"실제 설계도 — 4 STAGE",0.76,4.40,12.0,0.30,size=13,bold=True,color=DG)
stages2=[("수집·Edge","ThinQ 센서\nMQTT",DG),("처리·Store","Supabase\nPostgreSQL",TE),
         ("분석·Compute★","Rule Engine\n+ ML",RU),("대응·Act","Push Alert\n앱·증빙",AM)]
cx=0.76
for title,desc,fc3 in stages2:
    c=card(sl,cx,4.80,2.80,1.50,fill=fc3)
    txt(sl,title,cx+0.12,4.88,2.56,0.42,size=13,bold=True,color=WH)
    txt(sl,desc,cx+0.12,5.36,2.56,0.55,size=12,color=WH,wrap=True)
    if cx<10:
        txt(sl,"→",cx+2.82,5.40,0.28,0.30,size=14,bold=True,color=RU,align=PP_ALIGN.CENTER)
    cx+=3.00

# ══════════════════════════════════════════════════════════════
# 27 · P7 · 아키텍처
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P7",DG,"DX · 시스템 아키텍처","ERD/Flow")
h2(sl,"Edge → Cloud → App — 실제 구현 아키텍처")
sub(sl,"Raspberry Pi · Supabase · Flutter App · Koyeb 백엔드")
img(sl,f"{ASSETS}/system_architecture.png",0.58,2.2,12.15,4.8)

# ══════════════════════════════════════════════════════════════
# 28 · P7 · 설계 산출물
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P7",DG,"DX · 설계 산출물","FR/ERD/Flow")
h2(sl,"FR 8개 · ERD · Flow — 설계 문서 공개")
sub(sl,"기능 요구사항·데이터 모델·프로세스 흐름 전체 공개")
for i,(label,items,fc3) in enumerate([
    ("FR 1~4","FR1 환경감지\nFR2 위험알림\nFR3 자동기록\nFR4 보호자공유",DG),
    ("FR 5~8","FR5 인증증빙\nFR6 대시보드\nFR7 이력조회\nFR8 관리자권한",TE),
    ("ERD","6개 테이블\ndevices·events\nalerts·reports\nusers·logs",RU),
    ("Flow","위험감지→알림→기록\n보호자 확인→보고서\n인증평가 제출",AM),
]):
    cx2=0.58+i*3.21
    c=card(sl,cx2,2.2,2.90,5.0,fill=fc3)
    txt(sl,label,cx2+0.18,2.35,2.54,0.45,size=17,bold=True,color=WH)
    txt(sl,items,cx2+0.18,2.95,2.54,3.5,size=13,color=WH,wrap=True)

# ══════════════════════════════════════════════════════════════
# 29 · P7 · 실제 제품
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P7",DG,"DX · 실제 제품 화면","Demo")
h2(sl,"실제 구현된 화면 — 관리자 대시보드 · 데모 흐름")
img(sl,f"{ASSETS}/screen_admin.png",0.58,2.2,6.0,4.8)
img(sl,f"{ASSETS}/screen_demo.png",6.75,2.2,6.0,4.8)

# ══════════════════════════════════════════════════════════════
# 30 · P8 · 구현·검증
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P8",DG,"DX · 구현·검증","실제 작동")
h2(sl,"실제 구현 — 하드웨어·소프트웨어·클라우드 통합")
sub(sl,"Raspberry Pi 5 · ThinQ API · Supabase · Koyeb · Flutter")
demo_steps=[("①\n센서 감지","온도·습도·CO2\n공기질 실시간",DG),
            ("②\n위험 분류","Rule Engine\n임계값 초과시",RU),
            ("③\n자동 알림","Push Notification\n보호자·관리자",TE),
            ("④\n증빙 기록","자동 생성\n타임스탬프·서명",AM)]
cx=0.58
for i,(step,desc,fc3) in enumerate(demo_steps):
    c=card(sl,cx,2.2,2.88,2.5,fill=fc3)
    txt(sl,step,cx+0.15,2.30,2.58,0.72,size=17,bold=True,color=WH if fc3!=AM else DG)
    txt(sl,desc,cx+0.15,3.10,2.58,1.30,size=13,color=WH if fc3!=AM else DG,wrap=True)
    cx+=3.04
# Tech stack
rect(sl,0.58,4.88,12.15,1.78,fill=BE)
for i,(tech,role) in enumerate([("Raspberry Pi 5","Edge 센서"),("ThinQ API","LG 플랫폼"),
                                   ("Supabase","DB·Auth"),("Koyeb","Backend"),("Flutter","앱"),("Python","분석")]):
    cx2=0.76+i*2.02
    rect(sl,cx2,5.05,1.82,1.40,fill=DG)
    txt(sl,tech,cx2+0.08,5.10,1.66,0.48,size=12,bold=True,color=AM,align=PP_ALIGN.CENTER)
    txt(sl,role,cx2+0.08,5.62,1.66,0.70,size=11,color=WH,align=PP_ALIGN.CENTER,wrap=True)

# ══════════════════════════════════════════════════════════════
# 31 · P8+ · 과학적 근거
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P8+",DG,"DX · 과학적 근거","학술 논문")
h2(sl,"냄새·공기질 감지 — 학술 근거 기반 설계")
sub(sl,"Lowen 2007 · Peccia 2020 · WHO 기준 채택")
for i,(author,title,finding,fc3) in enumerate([
    ("Lowen et al. 2007","Influenza Virus\nTransmission\n(PNAS)","습도 40-60%에서 바이러스\n전파 억제 효과 입증",DG),
    ("Peccia et al. 2020","SARS-CoV-2 aerosol\n(Nature Research)","에어로졸 농도 측정으로\n감염 위험 예측 가능",RU),
    ("WHO 기준","Indoor Air Quality\nGuidelines","CO2 1000ppm 초과 시\n환기 의무 권고",TE),
]):
    cx2=0.58+i*4.27
    c=card(sl,cx2,2.1,3.90,5.1,fill=fc3)
    txt(sl,author,cx2+0.2,2.28,3.50,0.45,size=14,bold=True,color=AM)
    txt(sl,title,cx2+0.2,2.82,3.50,0.72,size=13,color=WH,wrap=True)
    txt(sl,finding,cx2+0.2,3.80,3.50,1.20,size=13,color=WH,wrap=True)

# ══════════════════════════════════════════════════════════════
# 32 · P8+ · DX Key Accelerator
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P8+",DG,"DX · Key Accelerator","핵심 가속 요인")
h2(sl,"4가지 DX 가속 요인 — 왜 지금 가능한가")
sub(sl,"하드웨어·클라우드·AI·규제 4축이 동시에 성숙")
for i,(title,desc,val,fc3) in enumerate([
    ("Edge AI","Raspberry Pi 5\n실시간 분석","< 1초\n지연",DG),
    ("Cloud Native","Supabase+Koyeb\n무중단 배포","99.9%\n가동률",RU),
    ("ThinQ 생태계","6천만 가구\n기기 연동 기반","기존\n인프라",TE),
    ("규제 타이밍","2026 인증 의무화\n디지털 증빙 수요","법적\n수요 창출",AM),
]):
    cx2=0.58+i*3.21
    c=card(sl,cx2,2.1,2.90,5.1,fill=fc3)
    txt(sl,title,cx2+0.18,2.28,2.54,0.45,size=16,bold=True,color=WH if fc3!=AM else DG)
    txt(sl,desc,cx2+0.18,2.85,2.54,1.20,size=13,color=WH if fc3!=AM else DG,wrap=True)
    txt(sl,val,cx2+0.18,4.40,2.54,0.80,size=20,bold=True,color=AM if fc3!=AM else DG)
# Bottom strip
rect(sl,0.58,6.45,12.15,0.70,fill=DG)
for i,(label,val2) in enumerate([("자동대응 건수","84건"),("연동 벤더","3개"),("감지 속도","< 1초"),("보안 계층","5 Layer")]):
    cx2=0.76+i*3.04
    txt(sl,label,cx2,6.52,2.0,0.28,size=11,color=AM)
    txt(sl,val2,cx2,6.82,2.0,0.28,size=14,bold=True,color=WH)

# ══════════════════════════════════════════════════════════════
# 33 · P9 · Performance Tracker
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P9",DG,"DX · Performance Tracker","Before/After")
h2(sl,"측정된 성과 — Before / After Sentinel")
sub(sl,"실제 테스트 환경 측정값 — 재현 가능")
kpis=[
    ("위험 감지 속도","30분+ 사람","< 5초 Sentinel","-94%","30min→5sec",RU),
    ("자동 대응 건수","0건 수동","84건 자동","↑ 84건","3일 테스트",DG),
    ("증빙 문서","수작업 3일","자동 즉시","-100% 시간","8,640건/년",TE),
    ("보호자 알림","전화·방문","앱 Push 즉시","< 1초","실시간",AM),
    ("위험구간 시간","10분/일","0.6분/일","-94%","실측",RU),
    ("자동대응 성공률","N/A","100%","100%","84건 기준",DG),
]
for i,(metric,before,after,delta,note,fc3) in enumerate(kpis):
    cy2=2.05+i*0.84
    rect(sl,0.58,cy2,8.0,0.72,fill=BE if i%2==0 else WH)
    txt(sl,metric,0.72,cy2+0.08,2.80,0.55,size=14,bold=True,color=DG)
    txt(sl,before,3.70,cy2+0.10,2.20,0.52,size=13,color=GR,wrap=True)
    txt(sl,after,6.10,cy2+0.10,2.30,0.52,size=13,color=DG,wrap=True)
    rect(sl,8.70,cy2+0.08,2.00,0.55,fill=fc3)
    txt(sl,delta,8.72,cy2+0.10,1.96,0.52,size=16,bold=True,color=WH if fc3!=AM else DG,align=PP_ALIGN.CENTER)
    txt(sl,note,10.88,cy2+0.14,1.80,0.44,size=12,color=DT)

# ══════════════════════════════════════════════════════════════
# 34 · P9 · 성과·사업성
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P9",DG,"DX · 성과·사업성","재무 추정")
h2(sl,"월 구독 모델 — 기관당 49만원 · 3년 BEP 달성 시나리오")
sub(sl,"요양병원 1,527개 · 요양원 3,712개 · 총 TAM 5,239개 기관")
for i,(label,val,desc,fc3) in enumerate([
    ("월 구독료","490,000원","기관당 (3개 요금제)",DG),
    ("3년 목표 기관수","300개","SAM 10% 침투",RU),
    ("연 매출 (3년)","17.6억원","300×49만×12",TE),
    ("BEP","Month 18","개발비 회수 시점",AM),
]):
    cx2=0.58+i*3.21
    c=card(sl,cx2,2.1,2.90,5.1,fill=fc3)
    txt(sl,label,cx2+0.18,2.28,2.54,0.55,size=14,color=WH if fc3!=AM else DG,wrap=True)
    txt(sl,val,cx2+0.18,3.00,2.54,0.88,size=24,bold=True,color=AM if fc3!=AM else DG)
    txt(sl,desc,cx2+0.18,4.00,2.54,0.70,size=13,color=WH if fc3!=AM else DG,wrap=True)

# ══════════════════════════════════════════════════════════════
# 35 · P9 · 사업화 로드맵
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P9",DG,"DX · 사업화 로드맵","3개년")
h2(sl,"Phase 1 POC → Phase 2 Scale → Phase 3 글로벌")
sub(sl,"요양병원 → 요양원 → 병원·호텔·학교 순 확장")
phases=[("Phase 1\n2026","POC · 파일럿\n요양병원 10개\n기능 검증·피드백",DG),
        ("Phase 2\n2027","Scale Up\n요양원 확장 300개\n월 구독 안정화",RU),
        ("Phase 3\n2028+","글로벌 확장\n동남아·일본\nLG 파트너십",TE)]
cx=0.58
for title,desc,fc3 in phases:
    c=card(sl,cx,2.1,3.88,5.1,fill=fc3)
    txt(sl,title,cx+0.2,2.28,3.48,0.70,size=18,bold=True,color=WH)
    txt(sl,desc,cx+0.2,3.10,3.48,2.5,size=15,color=WH,wrap=True)
    cx+=4.05

# ══════════════════════════════════════════════════════════════
# 36 · P9 · ESG 보고서
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,CR); footer(sl)
header(sl,"P9",DG,"DX · ESG 보고서 연계","사회적 가치")
h2(sl,"ESG — 환경·사회·거버넌스 기여 수치화")
sub(sl,"LG ESG 목표 달성에 기여하는 정량 지표")
for i,(esg,label,val,desc,fc3) in enumerate([
    ("E","탄소 절감","실내 환기 최적화\n불필요 기기 off","-탄소 기여",DG),
    ("S","안전 개선","낙상·감염 감지\n자동 대응 84건","사회 안전",RU),
    ("G","투명 기록","8,640건/년 증빙\n인증 자동화","거버넌스",TE),
]):
    cx2=0.58+i*4.27
    c=card(sl,cx2,2.1,3.90,5.1,fill=fc3)
    r=rect(sl,cx2+0.2,2.28,0.55,0.55,fill=WH)
    txt(sl,esg,cx2+0.22,2.30,0.51,0.51,size=22,bold=True,color=fc3,align=PP_ALIGN.CENTER)
    txt(sl,label,cx2+0.85,2.30,2.85,0.52,size=17,bold=True,color=WH)
    txt(sl,val,cx2+0.2,2.95,3.50,0.88,size=13,color=WH,wrap=True)
    txt(sl,desc,cx2+0.2,4.00,3.50,0.55,size=20,bold=True,color=AM)

# ══════════════════════════════════════════════════════════════
# 37 · 클로징
# ══════════════════════════════════════════════════════════════
sl=new_slide(); bg(sl,DG); footer(sl)
img(sl,f"{ASSETS}/cover.png",0,0,W,H) if os.path.exists(f"{ASSETS}/cover.png") else None
rect(sl,0,4.5,W,3.0,fill=DG)
txt(sl,"Space Sentinel",0.58,4.65,12.15,0.90,size=38,bold=True,color=WH)
txt(sl,"공간이 스스로 지킨다",0.58,5.60,12.15,0.55,size=22,color=AM)
txt(sl,"BX · CX · DX — 요양병원 안전 플랫폼",0.58,6.20,12.15,0.38,size=16,color=GR)

# ── Save ─────────────────────────────────────────────────────
prs.save(OUT)
print(f"✓ Saved: {OUT}")
print(f"  Slides: {len(prs.slides)}")
import os; print(f"  Size:   {os.path.getsize(OUT)/1024/1024:.1f} MB")
