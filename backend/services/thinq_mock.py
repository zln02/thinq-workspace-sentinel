"""ThinQ Connect SDK Mock 어댑터.

실제 `thinqconnect` SDK와 동일 메서드 시그니처:
    - async_get_device_list()
    - async_get_device_status(device_id)
    - async_get_device_available_controls(device_id)
    - async_post_device_control(device_id, body)

실배포 시: ThinQApiMock → ThinQApi 한 줄 교체.
"""
from __future__ import annotations

from typing import Optional

from pipeline.simulator.devices import Device, DeviceType

# device_type → 가능 명령 매핑 (ThinQ 공식 API 모사)
AVAILABLE_CONTROLS = {
    DeviceType.AIR_PURIFIER: {
        "airFlow": {"windStrength": ["LOW", "MED", "HIGH", "TURBO"]},
        "operation": {"airPurifierOperationMode": ["ON", "OFF"]},
    },
    DeviceType.AIR_CONDITIONER: {
        "operation": {"airConOperationMode": ["COOL", "HEAT", "AIR", "DRY", "OFF"]},
        "temperature": {"targetTemperature": (18, 30)},
        "airFlow": {"windStrength": ["LOW", "MED", "HIGH"], "ventilation": [True, False]},
    },
    DeviceType.VENTILATOR: {
        "ventilation": {"ventRate": ["OFF", "MIN", "MED", "MAX"]},
    },
    DeviceType.HUMIDIFIER: {
        "humidification": {"targetHumidity": (30, 70)},
        "operation": {"humidifierOperationMode": ["ON", "OFF"]},
    },
    DeviceType.DEHUMIDIFIER: {
        "humidification": {"targetHumidity": (30, 60)},
        "operation": {"dehumidifierOperationMode": ["ON", "OFF"]},
    },
    DeviceType.BOILER: {
        "operation": {"boilerOperationMode": ["HEAT", "OFF"]},
        "temperature": {"targetTemperature": (15, 28)},
    },
    DeviceType.ROBOT_CLEANER: {
        "operation": {"cleanOperationMode": ["NORMAL", "STERILIZE", "TURBO", "OFF"]},
    },
    DeviceType.STYLER: {
        "operation": {"stylerCourse": ["REFRESH", "STERILIZE", "TRUE_STEAM", "OFF"]},
    },
}


class ThinQApiMock:
    """`thinqconnect.ThinQApi` 와 동일 인터페이스. 내부에서 시뮬레이터 호출."""

    def __init__(self, devices: list[Device], country_code: str = "KR"):
        self._devices: dict[str, Device] = {d.device_id: d for d in devices}
        self.country_code = country_code

    async def async_get_device_list(self) -> list[dict]:
        return [
            {
                "device_id": d.device_id,
                "device_type": d.device_type.value,
                "alias": d.alias,
                "country_code": self.country_code,
            }
            for d in self._devices.values()
        ]

    async def async_get_device_status(self, device_id: str) -> Optional[dict]:
        d = self._devices.get(device_id)
        if not d:
            return None
        return {
            "device_id": d.device_id,
            "device_type": d.device_type.value,
            "power": d.state.power,
            "settings": d.state.settings,
        }

    async def async_get_device_available_controls(self, device_id: str) -> Optional[dict]:
        d = self._devices.get(device_id)
        if not d:
            return None
        return AVAILABLE_CONTROLS.get(d.device_type, {})

    async def async_post_device_control(self, device_id: str, body: dict) -> dict:
        d = self._devices.get(device_id)
        if not d:
            return {"code": 404, "message": f"Device {device_id} not found"}
        d.apply_control(body)
        return {"code": 200, "message": "OK", "device_id": device_id, "applied": body}

    def get_device(self, device_id: str) -> Optional[Device]:
        """시뮬레이터 직접 접근 — 테스트/디버그 전용."""
        return self._devices.get(device_id)
