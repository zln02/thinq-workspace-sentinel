"""Smart Protocol — 요양병원 8종 병원체별 차등 환경 정책.

병원체 + 5-Tier 등급 → 가전 8종 제어 명령 생성.
"""
from __future__ import annotations

from pipeline.simulator.devices import DeviceType

PATHOGEN_POLICY = {
    "COVID-19": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MAX",
        "purifier": "TURBO", "rationale": "외기 100% · ACH 6+ · UV 권장",
        "manual": ["확진자 1인 병실 격리", "병동 출입 방문객 제한 안내", "밀접접촉자 증상 모니터링"],
    },
    "INFLUENZA": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MED",
        "purifier": "HIGH", "boiler_on": True,
        "rationale": "Lowen 2007: 저온·저습 시 비말 안정성↑ → 22°C · 50% 유지",
        "manual": ["고위험 환자 항바이러스제 투여 검토", "병동 출입 방문객 마스크 안내"],
    },
    "RSV": {
        "target_temp": 23, "target_rh": 55, "vent_rate": "MED",
        "purifier": "HIGH",
        "rationale": "65세+ 폐렴 1순위 · 점막 보호 RH 55%",
        "manual": ["호흡곤란 환자 SpO₂ 모니터링 강화"],
    },
    "NOROVIRUS": {
        "target_temp": 23, "target_rh": 45, "vent_rate": "MED",
        "purifier": "MED", "cleaner": "STERILIZE", "dehumid_on": True,
        "rationale": "표면 핵심 · 제습 50%↓ + 로봇 살균 + 식기소독",
        "manual": ["오염 표면 접촉주의 격리", "식기 별도 소독 확인", "유증상자 코호트 격리"],
    },
    "TB": {
        "target_temp": 22, "target_rh": 45, "vent_rate": "MAX",
        "purifier": "TURBO",
        "rationale": "ACH 12+ · UV-C upper-room 필수 · 음압 시뮬",
        "manual": ["음압 격리실 이송", "N95 착용 / UV-C 상부살균 가동 확인", "접촉자 결핵검진"],
    },
    "PNEUMOCOCCUS": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MED",
        "purifier": "HIGH",
        "rationale": "요양원 폐렴 1순위 · 백신 + 환경",
        "manual": ["미접종 환자 폐렴구균 백신 검토"],
    },
    "CDI": {
        "target_temp": 23, "target_rh": 50, "vent_rate": "MED",
        "purifier": "MED", "cleaner": "TURBO",
        "rationale": "항생제 관련 설사 · 표면 살균 강화",
        "manual": ["접촉주의 격리 (장갑·가운)", "비누·물 손위생 (알코올 무효)"],
    },
    "SCABIES": {
        "target_temp": 22, "target_rh": 50, "vent_rate": "MIN",
        "styler": "TRUE_STEAM",
        "rationale": "옴 집단 발생 · 스타일러 트루스팀 + 린넨 살균",
        "manual": ["린넨 60℃ 세탁 격리", "동거 환자 동시 치료", "접촉주의 격리"],
    },
}


# 가전 타입 → 화면 표기용 한글 별칭 (간호사/보호자 뷰)
DEVICE_ALIAS_KO = {
    "AIR_PURIFIER": "공기청정기",
    "AIR_CONDITIONER": "에어컨",
    "VENTILATOR": "환기청정기",
    "HUMIDIFIER": "가습기",
    "DEHUMIDIFIER": "제습기",
    "BOILER": "보일러",
    "ROBOT_CLEANER": "로봇청소기",
    "STYLER": "스타일러",
}


def _summarize_mode(device_type: str, body: dict) -> str:
    """제어 body에서 사람이 읽는 대표 설정값 1개를 추출 (화면 표기용)."""
    air = body.get("airFlow", {})
    if "windStrength" in air:
        return str(air["windStrength"])
    vent = body.get("ventilation", {})
    if "ventRate" in vent:
        return f"{vent['ventRate']} 환기"
    if "targetHumidity" in body.get("humidification", {}):
        return f"RH {body['humidification']['targetHumidity']}%"
    op = body.get("operation", {})
    temp = body.get("temperature", {}).get("targetTemperature")
    if "boilerOperationMode" in op:
        return f"난방 {temp}℃" if temp else "난방"
    if "airConOperationMode" in op:
        return f"냉방 {temp}℃" if temp else "냉방"
    if "cleanOperationMode" in op:
        return str(op["cleanOperationMode"])
    if "stylerCourse" in op:
        return str(op["stylerCourse"])
    return "ON"


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

    device_summary = []
    for action in actions:
        dtype = action["device_type"]
        device_summary.append({
            "type": dtype,
            "alias": DEVICE_ALIAS_KO.get(dtype, dtype),
            "mode": _summarize_mode(dtype, action["body"]),
            "auto": True,
        })
        for d in by_type.get(dtype, []):
            res = await thinq_api.async_post_device_control(d.device_id, action["body"])
            results.append({"device_id": d.device_id, "result": res})

    # 자동 제어로 끝나지 않는 사람-개입 조치 (간호사 뷰) — ALERT 이상에서만 노출
    manual_required = []
    if tier in ("ALERT", "HIGH_RISK", "CRITICAL"):
        manual_required = PATHOGEN_POLICY.get(pathogen, {}).get("manual", [])

    return {
        "pathogen": pathogen,
        "tier": tier,
        "season": season,
        "rationale": PATHOGEN_POLICY.get(pathogen, {}).get("rationale", ""),
        "actions_count": len(actions),
        "applied_count": len(results),
        "details": results,
        "device_summary": device_summary,
        "manual_required": manual_required,
    }
