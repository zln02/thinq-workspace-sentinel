#!/usr/bin/env python3
"""ThinQ Space Sentinel — 최신 ERD 자동 생성 (실 DB 스키마 기반).
실행: python3 gen_erd.py && dot -Tpng erd.dot -o ThinQ-Sentinel_ERD.png
"""
import os, subprocess

# 실 DB(sentinel 스키마) 컬럼 — information_schema 추출본 (2026-06-22)
SENTINEL = {
    "sites": [("id","uuid","PK"),("site_name","varchar",""),("site_type","varchar",""),
              ("region_code","varchar",""),("subscription_phase","smallint",""),
              ("contract_start","date",""),("max_occupancy","int",""),("created_at","timestamptz","")],
    "spaces": [("id","uuid","PK"),("site_id","uuid","FK"),("space_name","varchar",""),
               ("space_type","varchar",""),("area_m2","float",""),("ceiling_m","float",""),
               ("volume_m3","float",""),("max_occupancy","int",""),("device_ids","array",""),("created_at","timestamptz","")],
    "users": [("id","uuid","PK"),("email","varchar",""),("role","varchar",""),("site_id","uuid","FK"),
              ("anonymized_id","varchar",""),("slack_user_id","varchar",""),("created_at","timestamptz",""),("deleted_at","timestamptz","")],
    "sensor_readings": [("time","timestamptz","PK"),("site_id","uuid","FK"),("space_id","uuid","FK"),
              ("device_id","varchar",""),("co2_ppm","float",""),("pm25_ugm3","float",""),
              ("temperature","float",""),("humidity","float",""),("occupancy","int",""),
              ("ventilation_rate","float",""),("gas_raw","float","")],
    "rehva_results": [("id","uuid","PK"),("calculated_at","timestamptz",""),("site_id","uuid","FK"),
              ("space_id","uuid","FK"),("poi","float",""),("r_event","float",""),("risk_tier","smallint",""),
              ("i_value","float",""),("q_value","float",""),("tier_source","text","")],
    "device_actions": [("id","uuid","PK"),("action_at","timestamptz",""),("site_id","uuid","FK"),
              ("device_id","varchar",""),("action_type","varchar",""),("trigger_tier","smallint",""),
              ("protocol_name","varchar",""),("status","varchar",""),("response_ms","int","")],
    "alerts": [("id","uuid","PK"),("alerted_at","timestamptz",""),("site_id","uuid","FK"),("space_id","uuid","FK"),
              ("from_tier","smallint",""),("to_tier","smallint",""),("channel","varchar",""),
              ("recipient","varchar",""),("message","text",""),("status","varchar",""),("poi_snapshot","float","")],
    "esg_reports": [("id","uuid","PK"),("site_id","uuid","FK"),("report_month","date",""),("avg_poi","float",""),
              ("max_tier_reached","smallint",""),("activation_count","int",""),("compliance_rate","float",""),
              ("pdf_path","varchar",""),("generated_at","timestamptz","")],
    "pathogens": [("code","varchar","PK"),("name_kr","varchar",""),("quanta_rate","float",""),
              ("transmission_mode","varchar",""),("elderly_mortality_factor","float",""),("target_temp","float",""),
              ("target_rh","float",""),("min_ach","float",""),("uv_required","bool",""),("surface_priority","bool",""),("notes","text","")],
    "device_catalog": [("device_type","varchar","PK"),("name_kr","varchar",""),("nursing_priority","smallint",""),
              ("wells_riley_var","varchar",""),("season_master","varchar",""),("notes","text","")],
    "legal_mappings": [("id","int","PK"),("law_code","varchar",""),("law_name_kr","varchar",""),("article","varchar",""),
              ("obligation","text",""),("sentinel_evidence","text",""),("enforcement_authority","varchar","")],
    "external_signals": [("id","uuid","PK"),("collected_at","timestamptz",""),("signal_type","varchar",""),
              ("region_code","varchar",""),("signal_value","float",""),("lead_weeks","smallint",""),("raw_data","jsonb","")],
    "ml_predictions": [("id","uuid","PK"),("predicted_at","timestamptz",""),("region_code","varchar",""),
              ("target_date","date",""),("predicted_risk","float",""),("predicted_tier","smallint",""),
              ("model_version","varchar",""),("f1_score","float","")],
}
# UIS 외부 DB (urban_immune.public) — read-only 소비
UIS = {
    "risk_scores": [("time","timestamptz",""),("region","text",""),("composite_score","float",""),
              ("l1_score","float",""),("l2_score","float",""),("l3_score","float",""),("alert_level","text","")],
    "layer_signals": [("time","timestamptz",""),("layer","text",""),("region","text",""),
              ("value","float",""),("source","text",""),("pathogen","text","")],
    "confirmed_cases": [("time","timestamptz",""),("region","text",""),("per_100k","float",""),("disease","text","")],
}
# 관계: (from_table, to_table, label)  FK=실제 외래키, ↝=논리참조
FKS = [("spaces","sites","site_id (FK)"),("users","sites","site_id (FK)"),("esg_reports","sites","site_id (FK)")]
LOGICAL = [("sensor_readings","spaces","space_id"),("sensor_readings","sites","site_id"),
           ("rehva_results","spaces","space_id"),("rehva_results","sites","site_id"),
           ("device_actions","sites","site_id"),("alerts","spaces","space_id"),("alerts","sites","site_id"),
           ("rehva_results","pathogens","q_value↝code")]

ACCENT="#7a0024"
def table_node(name, cols, header_color):
    rows = f'<tr><td bgcolor="{header_color}" align="center"><font color="white"><b>{name}</b></font></td></tr>'
    for c,t,k in cols:
        kb = {"PK":" 🔑","FK":" ⚿"}.get(k,"")
        b = "<b>" if k=="PK" else ""; be = "</b>" if k=="PK" else ""
        rows += f'<tr><td align="left" port="{c}"><font point-size="10">{b}{c}{be} <font color="#888">{t}</font>{kb}</font></td></tr>'
    return f'  "{name}" [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4">{rows}</table>>];\n'

dot = ['digraph ERD {','  rankdir=LR;','  graph [fontname="NanumGothic,sans-serif", bgcolor="white", splines=ortho, nodesep=0.5, ranksep=1.2];',
       '  node [shape=plaintext, fontname="NanumGothic,sans-serif"];','  edge [color="#7a0024", arrowhead=crow, arrowtail=none, fontsize=9, fontcolor="#555"];']
dot.append('  subgraph cluster_sentinel {')
dot.append(f'    label="sentinel 스키마 (자사 DB)"; fontname="NanumGothic,sans-serif"; fontsize=14; color="{ACCENT}"; style="rounded";')
for n,c in SENTINEL.items(): dot.append(table_node(n,c,ACCENT))
dot.append('  }')
dot.append('  subgraph cluster_uis {')
dot.append('    label="urban_immune · UIS 외부 DB (read-only)"; fontname="NanumGothic,sans-serif"; fontsize=14; color="#1d4ed8"; style="rounded";')
for n,c in UIS.items(): dot.append(table_node(n,c,"#1d4ed8"))
dot.append('  }')
for a,b,l in FKS: dot.append(f'  "{a}" -> "{b}" [label="{l}", penwidth=1.6];')
for a,b,l in LOGICAL: dot.append(f'  "{a}" -> "{b}" [label="{l}", style=dashed, penwidth=1.0];')
dot.append('}')

here=os.path.dirname(os.path.abspath(__file__))
open(os.path.join(here,"erd.dot"),"w").write("\n".join(dot))
print("erd.dot written")
r=subprocess.run(["dot","-Tpng","-Gdpi=140",os.path.join(here,"erd.dot"),"-o",os.path.join(here,"ThinQ-Sentinel_ERD.png")],capture_output=True,text=True)
print("render:", "OK" if r.returncode==0 else r.stderr[:300])
