"""explain_plan 검증 — 관리자 대시보드 흐름 viz(⑤ 가전 세팅)용 제어계획 설명."""
from backend.services.smart_protocol import explain_plan, DEVICE_KR


def test_all_8_devices_accounted():
    """8종 가전이 가동(applied) 또는 미가동(skipped)에 빠짐없이 분류된다."""
    p = explain_plan("COVID-19", "ALERT", "summer")
    devs = {d["device"] for d in p["applied"]} | {d["device"] for d in p["skipped"]}
    assert devs == set(DEVICE_KR.keys())


def test_norovirus_triggers_surface_disinfection():
    """노로: 로봇청소기 STERILIZE + 제습 가동, 가습기는 미가동."""
    p = explain_plan("NOROVIRUS", "ALERT", "summer")
    applied = {d["device"]: d for d in p["applied"]}
    assert "ROBOT_CLEANER" in applied and "STERILIZE" in applied["ROBOT_CLEANER"]["setting"]
    assert "DEHUMIDIFIER" in applied
    assert "HUMIDIFIER" not in applied


def test_tier_bumps_purifier_to_turbo():
    """HIGH 강도 정책(RSV)이 ALERT 이상에서 공기청정기 TURBO로 상향된다."""
    low = {d["device"]: d for d in explain_plan("RSV", "MONITOR", "winter")["applied"]}
    high = {d["device"]: d for d in explain_plan("RSV", "ALERT", "winter")["applied"]}
    assert "TURBO" in high["AIR_PURIFIER"]["setting"]
    assert "TURBO" not in low["AIR_PURIFIER"]["setting"]


def test_winter_enables_boiler_and_humidifier():
    """겨울: 보일러·가습기 가동, 에어컨 미가동."""
    p = explain_plan("INFLUENZA", "CAUTION", "winter")
    applied = {d["device"] for d in p["applied"]}
    skipped = {d["device"] for d in p["skipped"]}
    assert {"BOILER", "HUMIDIFIER"} <= applied
    assert "AIR_CONDITIONER" in skipped


def test_every_entry_has_reason():
    """모든 항목(가동/미가동)에 사유가 붙는다 — 흐름 viz '왜?' 보장."""
    p = explain_plan("TB", "HIGH_RISK", "autumn")
    assert all(d.get("reason") for d in p["applied"] + p["skipped"])
    assert all(d.get("setting") for d in p["applied"])
