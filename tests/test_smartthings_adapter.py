"""SmartThings 에어컨 어댑터 — body→명령 매핑 단위테스트 (네트워크/플러그인 없이).

_command 를 가로채 실제 호출 없이 변환 로직만 검증. asyncio.run 으로 동기 실행.
"""
import asyncio

from backend.services.smartthings_adapter import (
    _MODE_MAP,
    _WIND_TO_FAN,
    SmartThingsAdapter,
)


def test_wind_fan_mapping():
    assert _WIND_TO_FAN["TURBO"] == "turbo"
    assert _WIND_TO_FAN["LOW"] == "low"


def test_mode_mapping():
    assert _MODE_MAP["WIND"] == "wind"
    assert _MODE_MAP["DRY"] == "dry"
    assert _MODE_MAP["COOL"] == "cool"


def _patch_cmd(ad, sink):
    async def fake_cmd(capability, command, args=None):
        sink.append((capability, command, args or []))
        return {"code": 200}
    ad._command = fake_cmd


def test_control_body_to_commands():
    ad = SmartThingsAdapter(token="x", device_id="d1")
    sent = []
    _patch_cmd(ad, sent)
    asyncio.run(ad.async_post_device_control("ac-1", {
        "operation": {"airConOperationMode": "ON"},
        "airConMode": {"mode": "WIND"},
        "airFlow": {"windStrength": "HIGH"},
        "temperature": {"target": 24},
    }))
    caps = {c[0]: (c[1], c[2]) for c in sent}
    assert caps["switch"][0] == "on"
    assert caps["airConditionerMode"] == ("setAirConditionerMode", ["wind"])
    assert caps["airConditionerFanMode"] == ("setFanMode", ["high"])
    assert caps["thermostatCoolingSetpoint"] == ("setCoolingSetpoint", [24])


def test_power_off_body():
    ad = SmartThingsAdapter(token="x", device_id="d1")
    sent = []
    _patch_cmd(ad, sent)
    asyncio.run(ad.async_post_device_control("ac-1", {"operation": {"airConOperationMode": "OFF"}}))
    assert ("switch", "off", []) in sent
