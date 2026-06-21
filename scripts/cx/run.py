# -*- coding: utf-8 -*-
"""ThinQ Workspace Sentinel — 요양병원 VOC 텍스트마이닝 파이프라인 (재현 가능).

서브커맨드:
  ingest  : stdin(JSON: [{query,persona,channel,items:[{title,description,pubDate,link}]}]) → data/nursing/raw.csv 누적(중복 제거)
  analyze : raw.csv → Kiwi 형태소 → 노이즈필터 → 감정사전 → LDA(perplexity 스캔) → CAM → 정부/경쟁 시그널 → analysis/*.json + 요약

크롤링은 Naver Search(뉴스·블로그·카페·지식iN) 결과 스니펫(title+description) 사용.
실행: python scripts/cx/run.py ingest < batch.json  /  python scripts/cx/run.py analyze
"""
import sys, os, re, json, csv, html
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(ROOT, "data", "nursing", "raw.csv")
OUT = os.path.join(ROOT, "data", "nursing", "analysis")
os.makedirs(os.path.dirname(RAW), exist_ok=True)
os.makedirs(OUT, exist_ok=True)

TAG = re.compile(r"<[^>]+>")
def clean(s: str) -> str:
    s = html.unescape(s or "")
    s = TAG.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()

FIELDS = ["query", "persona", "channel", "title", "desc", "pubDate", "text", "link"]

def ingest():
    batch = json.load(sys.stdin)
    rows = []
    for blk in batch:
        q, persona, ch = blk["query"], blk.get("persona", "etc"), blk.get("channel", "")
        for it in blk.get("items", []):
            title, desc = clean(it.get("title", "")), clean(it.get("description", ""))
            rows.append({"query": q, "persona": persona, "channel": ch,
                         "title": title, "desc": desc, "pubDate": it.get("pubDate", ""),
                         "text": (title + " " + desc).strip(), "link": it.get("link", it.get("originallink", ""))})
    seen, existing = set(), []
    if os.path.exists(RAW):
        with open(RAW, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                existing.append(r); seen.add((r["text"]))
    added = 0
    for r in rows:
        if r["text"] and r["text"] not in seen:
            existing.append(r); seen.add(r["text"]); added += 1
    with open(RAW, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader()
        for r in existing: w.writerow({k: r.get(k, "") for k in FIELDS})
    print(f"ingest: +{added}  total={len(existing)}")

def analyze():
    from kiwipiepy import Kiwi
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.decomposition import LatentDirichletAllocation
    import lexicon as lex

    with open(RAW, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    collected = len(rows)
    rows = [r for r in rows if not lex.is_noise(r["text"])]
    analyzed = len(rows)

    kiwi = Kiwi()
    STOP = {"요양", "병원", "요양병원", "환자", "어르신", "노인", "시설", "관련", "정도", "경우",
            "생각", "이번", "오늘", "기자", "뉴스", "사진", "제공", "지난", "이상", "위해", "통해"}
    def nouns(text):
        return [t.form for t in kiwi.tokenize(text)
                if t.tag in ("NNG", "NNP") and len(t.form) > 1 and t.form not in STOP]

    for r in rows:
        r["_nouns"] = nouns(r["text"])
        r["_neg"] = lex.is_negative(r["text"])
        r["_pos"] = lex.is_positive(r["text"])

    # ---- 감정(부정도) 집계 ----
    def neg_rate(subset):
        return round(100 * sum(1 for r in subset if r["_neg"]) / len(subset), 1) if subset else 0.0
    by_persona = defaultdict(list)
    for r in rows: by_persona[r["persona"]].append(r)
    persona_neg = {p: {"n": len(v), "neg_rate": neg_rate(v)} for p, v in by_persona.items()}

    by_kw = defaultdict(list)
    for r in rows: by_kw[r["query"]].append(r)
    kw_neg = {q: {"n": len(v), "neg_rate": neg_rate(v), "persona": v[0]["persona"]} for q, v in by_kw.items()}

    # ---- CAM: 빈도 × 부정도 (키워드 단위) ----
    import statistics as st
    freqs = [v["n"] for v in kw_neg.values()]
    negs = [v["neg_rate"] for v in kw_neg.values()]
    fmed, nmed = (st.median(freqs) if freqs else 0), (st.median(negs) if negs else 0)
    opportunity = sorted(
        [{"keyword": q, **v} for q, v in kw_neg.items() if v["n"] >= fmed and v["neg_rate"] >= nmed],
        key=lambda x: x["neg_rate"], reverse=True)

    # ---- LDA + perplexity 스캔 (페인포인트 페르소나 통합) ----
    pain_docs = [" ".join(r["_nouns"]) for r in rows
                 if r["persona"] in ("manager", "staff", "family") and r["_nouns"]]
    perplex, lda_topics = {}, []
    if len(pain_docs) >= 20:
        vec = CountVectorizer(max_features=500, min_df=3, max_df=0.95)
        X = vec.fit_transform(pain_docs)
        for n in range(2, 11):
            m = LatentDirichletAllocation(n_components=n, max_iter=20, learning_method="batch", random_state=42)
            m.fit(X); perplex[n] = round(m.perplexity(X), 1)
        best = LatentDirichletAllocation(n_components=5, max_iter=20, learning_method="batch", random_state=42)
        best.fit(X)
        terms = vec.get_feature_names_out()
        for ti, comp in enumerate(best.components_):
            top = [terms[i] for i in comp.argsort()[:-9:-1]]
            lda_topics.append({"topic": ti, "terms": top})

    # ---- 단일 키워드 부정도 최고 (가장 강한 신호) ----
    strongest = sorted([{"keyword": q, **v} for q, v in kw_neg.items() if v["n"] >= 5],
                       key=lambda x: x["neg_rate"], reverse=True)[:5]

    # ---- 경쟁/통합 공백 시그널 ----
    comp = [r for r in rows if r["persona"] == "competitor"]
    def has_all(t, ws): return all(w in t for w in ws)
    void = {}
    if comp:
        nC = len(comp)
        sig = {
            "체온+공기 통합": sum(1 for r in comp if has_all(r["text"], ["체온"]) and ("공기" in r["text"] or "공기청정" in r["text"])),
            "보호자앱 연계": sum(1 for r in comp if "보호자" in r["text"] and "앱" in r["text"]),
            "지역경보 연동": sum(1 for r in comp if ("지역" in r["text"] or "경보" in r["text"]) and "연동" in r["text"]),
            "감염관리료 자동증빙": sum(1 for r in comp if "감염관리료" in r["text"] and ("자동" in r["text"] or "증빙" in r["text"])),
        }
        void = {"n_competitor": nC, "signals": {k: {"count": c, "pct": round(100 * c / nC, 2)} for k, c in sig.items()}}
        brands = {b: sum(1 for r in comp if b in r["text"]) for b in ["삼성", "LG", "KT", "SK", "뷰노", "코웨이"]}
        tot_brand = sum(brands.values())
        void["brands"] = brands
        void["brand_share_pct"] = round(100 * tot_brand / nC, 2)

    result = {
        "corpus": {"collected": collected, "analyzed": analyzed,
                   "by_persona": {p: len(v) for p, v in by_persona.items()},
                   "keywords": len(by_kw), "channels": sorted(set(r["channel"] for r in rows))},
        "sentiment_lexicon": {"negative": len(lex.NEGATIVE), "positive": len(lex.POSITIVE)},
        "persona_negativity": persona_neg,
        "cam_opportunity_zone": opportunity[:8],
        "cam_median": {"freq": fmed, "neg_rate": nmed},
        "strongest_single_keyword": strongest,
        "lda": {"perplexity_scan": perplex, "chosen_n": 5, "topics": lda_topics},
        "integration_void": void,
    }
    with open(os.path.join(OUT, "result.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False, indent=2))

def ingestdir():
    """data/nursing/raw_json/{persona}__{channel}__{slug}.json (raw Naver 응답) 일괄 적재."""
    d = os.path.join(ROOT, "data", "nursing", "raw_json")
    batch = []
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".json"):
            continue
        persona, channel, slug = (fn[:-5].split("__") + ["", "", ""])[:3]
        with open(os.path.join(d, fn), encoding="utf-8") as f:
            try:
                resp = json.load(f)
            except Exception as e:
                print(f"skip {fn}: {e}"); continue
        batch.append({"query": slug, "persona": persona, "channel": channel,
                      "items": resp.get("items", [])})
    sys.stdin = None
    # reuse ingest() logic by injecting batch
    global _BATCH
    _BATCH = batch
    _ingest_batch(batch)

def _ingest_batch(batch):
    rows = []
    for blk in batch:
        q, persona, ch = blk["query"], blk.get("persona", "etc"), blk.get("channel", "")
        for it in blk.get("items", []):
            title, desc = clean(it.get("title", "")), clean(it.get("description", ""))
            rows.append({"query": q, "persona": persona, "channel": ch,
                         "title": title, "desc": desc, "pubDate": it.get("pubDate", ""),
                         "text": (title + " " + desc).strip(), "link": it.get("link", it.get("originallink", ""))})
    seen, existing = set(), []
    if os.path.exists(RAW):
        with open(RAW, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                existing.append(r); seen.add(r["text"])
    added = 0
    for r in rows:
        if r["text"] and r["text"] not in seen:
            existing.append(r); seen.add(r["text"]); added += 1
    with open(RAW, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader()
        for r in existing: w.writerow({k: r.get(k, "") for k in FIELDS})
    print(f"ingestdir: +{added}  total={len(existing)}")

def addtext():
    """addtext <persona> <channel> <query> : stdin 한 줄=한 문서(title+desc 합본) → raw.csv 누적."""
    persona, channel, query = sys.argv[2], sys.argv[3], " ".join(sys.argv[4:])
    lines = [clean(l) for l in sys.stdin.read().splitlines() if l.strip()]
    batch = [{"query": query, "persona": persona, "channel": channel,
              "items": [{"title": "", "description": t} for t in lines]}]
    _ingest_batch(batch)

def _load_env():
    """ROOT/.env 를 의존성 없이 파싱해 환경변수로 주입 (이미 설정된 값은 보존)."""
    p = os.path.join(ROOT, ".env")
    if not os.path.exists(p):
        return
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_ENDPOINT = {"news": "news", "blog": "blog", "cafe": "cafearticle", "kin": "kin"}

def _naver_call(channel, query, start, display, cid, secret):
    import urllib.parse, urllib.request
    ep = _ENDPOINT[channel]
    url = "https://openapi.naver.com/v1/search/%s.json?%s" % (
        ep, urllib.parse.urlencode({"query": query, "display": display, "start": start, "sort": "sim"}))
    req = urllib.request.Request(url, headers={
        "X-Naver-Client-Id": cid, "X-Naver-Client-Secret": secret})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)

def crawl():
    """crawl [maxper] : Naver API로 keywords.PLAN 전체를 채널별 페이지네이션 수집 → raw.csv 누적.
    .env의 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 사용. maxper=키워드×채널당 최대 건수(기본 1000, 100 단위)."""
    import time, urllib.error
    import keywords as KW
    _load_env()
    cid, secret = os.environ.get("NAVER_CLIENT_ID"), os.environ.get("NAVER_CLIENT_SECRET")
    if not cid or not secret:
        print("ERROR: .env에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 없습니다."); sys.exit(2)
    maxper = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    maxper = min(1000, max(100, (maxper // 100) * 100))

    batch, calls, errors = [], 0, 0
    for query, persona, channels in KW.PLAN:
        for ch in channels:
            items, start = [], 1
            while start <= maxper:
                try:
                    resp = _naver_call(ch, query, start, 100, cid, secret)
                    calls += 1
                except urllib.error.HTTPError as e:
                    errors += 1
                    if e.code == 429:        # rate limit → 잠시 대기 후 재시도
                        time.sleep(1.0); continue
                    break                    # 400(start>1000 등) → 다음 채널
                except Exception:
                    errors += 1; break
                got = resp.get("items", [])
                if not got:
                    break
                items.extend(got)
                start += 100
                time.sleep(0.12)             # API 매너 (초당 ~8콜)
            batch.append({"query": query, "persona": persona, "channel": ch, "items": items})
            print("  %-28s %-5s +%d" % (query, ch, len(items)), flush=True)
    print("calls=%d errors=%d" % (calls, errors))
    _ingest_batch(batch)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "analyze"
    sys.path.insert(0, HERE)
    {"ingest": ingest, "ingestdir": ingestdir, "addtext": addtext,
     "crawl": crawl, "analyze": analyze}.get(cmd, analyze)()
