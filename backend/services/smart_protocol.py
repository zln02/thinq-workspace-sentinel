"""Smart Protocol — 요양병원 8종 병원체별 차등 환경 정책.

병원체 + 5-Tier 등급 → 가전 8종 제어 명령 생성.
"""
from __future__ import annotations

from pipeline.simulator.devices import DeviceType

PATHOGEN_POLICY = {
    "COVID-19": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MAX",
        "purifier": "TURBO", "rationale": "외기 100% · ACH 6+ · UV 권장",
    },
    "INFLUENZA": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MED",
        "purifier": "HIGH", "boiler_on": True,
        "rationale": "Lowen 2007: 저온·저습 시 비말 안정성↑ → 22°C · 50% 유지",
    },
    "RSV": {
        "target_temp": 23, "target_rh": 55, "vent_rate": "MED",
        "purifier": "HIGH",
        "rationale": "65세+ 폐렴 1순위 · 점막 보호 RH 55%",
    },
    "NOROVIRUS": {
        "target_temp": 23, "target_rh": 45, "vent_rate": "MED",
        "purifier": "MED", "cleaner": "STERILIZE", "dehumid_on": True,
        "rationale": "표면 핵심 · 제습 50%↓ + 로봇 살균 + 식기소독",
    },
    "TB": {
        "target_temp": 22, "target_rh": 45, "vent_rate": "MAX",
        "purifier": "TURBO",
        "rationale": "ACH 12+ · UV-C upper-room 필수 · 음압 시뮬",
    },
    "PNEUMOCOCCUS": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MED",
        "purifier": "HIGH",
        "rationale": "요양원 폐렴 1순위 · 백신 + 환경",
    },
    "CDI": {
        "target_temp": 23, "target_rh": 50, "vent_rate": "MED",
        "purifier": "MED", "cleaner": "TURBO",
        "rationale": "항생제 관련 설사 · 표면 살균 강화",
    },
    "SCABIES": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MIN",
        "styler": "TRUE_STEAM",
        "rationale": "옴 집단 발생 · 스타일러 트루스팀 + 린넨 살균",
    },
}


TIER_INTENSITY = {
    "MONITOR": 0.3,
    "CAUTION": 0.6,
    "ALERT": 1.0,
    "HIGH_RISK": 1.2,
    "CRITICAL": 1.5,
}


def plan_actions(pathogen: str, tier: str, season: str = "summer") -> list[dict]:
    """병원체 + 등급 + 계절 → 가전별 제어 명령 리스트."""
    policy = PATHOGEN_POLICY.get(pathogen, PATHOGEN_POLICY["COVID-19"])
    intensity = TIER_INTENSITY.get(tier, 1.0)
    actions = []

    # 1. 공기청정기
    strength = policy.get("purifier", "MED")
    if intensity >= 1.0 and strength == "HIGH":
        strength = "TURBO"
    actions.append({
        "device_type": DeviceType.AIR_PURIFIER.value,
        "body": {"airFlow": {"windStrength": strength}},
    })

    # 2. 에어컨 (여름·환절기) — 폭염 노인 사망 예방
    if season in ("summer", "autumn"):
        actions.append({
            "device_type": DeviceType.AIR_CONDITIONER.value,
            "body": {
                "operation": {"airConOperationMode": "COOL"},
                "temperature": {"targetTemperature": policy["target_temp"] + 4},
                "airFlow": {"ventilation": True},
            },
        })

    # 3. 환기청정기 — Wells-Riley Q 핵심
    vent_rate = policy["vent_rate"]
    if intensity >= 1.2 and vent_rate != "MAX":
        vent_rate = "MAX"
    actions.append({
        "device_type": DeviceType.VENTILATOR.value,
        "body": {"ventilation": {"ventRate": vent_rate}},
    })

    # 4. 가습기 (겨울·인플루엔자 핵심)
    if season == "winter" or pathogen in ("INFLUENZA", "RSV"):
        actions.append({
            "device_type": DeviceType.HUMIDIFIER.value,
            "body": {"humidification": {"targetHumidity": policy["target_rh"]}},
        })

    # 5. 제습기 (장마·노로)
    if season == "summer" or policy.get("dehumid_on"):
        actions.append({
            "device_type": DeviceType.DEHUMIDIFIER.value,
            "body": {"humidification": {"targetHumidity": policy["target_rh"]}},
        })

    # 6. 보일러 (겨울 노인 저체온증 + 인플루엔자)
    if season == "winter" or policy.get("boiler_on"):
        actions.append({
            "device_type": DeviceType.BOILER.value,
            "body": {
                "operation": {"boilerOperationMode": "HEAT"},
                "temperature": {"targetTemperature": policy["target_temp"]},
            },
        })

    # 7. 로봇청소기
    cleaner_mode = policy.get("cleaner", "NORMAL")
    if cleaner_mode != "NORMAL":
        actions.append({
            "device_type": DeviceType.ROBOT_CLEANER.value,
            "body": {"operation": {"cleanOperationMode": cleaner_mode}},
        })

    # 8. 스타일러 (옴·요양보호사 의류 살균)
    if policy.get("styler"):
        actions.append({
            "device_type": DeviceType.STYLER.value,
            "body": {"operation": {"stylerCourse": policy["styler"]}},
        })

    return actions


async def execute_protocol(thinq_api, devices: list, pathogen: str, tier: str, season: str = "summer") -> dict:
    """병원체 등급 변화 시 가전 일괄 제어 — 실제 호출."""
    actions = plan_actions(pathogen, tier, season)
    results = []
    by_type = {}
    for d in devices:
        by_type.setdefault(d.device_type.value, []).append(d)

    for action in actions:
        for d in by_type.get(action["device_type"], []):
            res = await thinq_api.async_post_device_control(d.device_id, action["body"])
            results.append({"device_id": d.device_id, "result": res})

    return {
        "pathogen": pathogen,
        "tier": tier,
        "season": season,
        "rationale": PATHOGEN_POLICY.get(pathogen, {}).get("rationale", ""),
        "actions_count": len(actions),
        "applied_count": len(results),
        "details": results,
    }
