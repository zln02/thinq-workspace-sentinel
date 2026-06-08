"""삼성 SmartThings 에어컨 실기기 어댑터.

`CowayAdapter` 와 동일한 `async_post_device_control(device_id, body)` 인터페이스를
제공하여 `smart_protocol`/sensor 거버넌스가 벤더 무관하게 에어컨을 제어한다.

인증: `.env` 의 `SMARTTHINGS_TOKEN`(Personal Access Token) + `SMARTTHINGS_AC_DEVICE_ID`
(하드코딩 금지). 토큰은 https://account.smartthings.com/tokens 에서 발급.

천장형이 SmartThings(WiFi킷)에 등록돼 있어야 함. 등록 안 된 상업용은 IR 블래스터 경로.

API: https://api.smartthings.com/v1
  GET  /devices                       — 기기 목록(에어컨 자동탐색)
  GET  /devices/{id}/status           — 전원/모드/온도/풍량 상태
  POST /devices/{id}/commands         — 제어 명령
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_BASE = "https://api.smartthings.com/v1"

# ThinQ 호환 windStrength → SmartThings fanMode 매핑
_WIND_TO_FAN = {"TURBO": "turbo", "HIGH": "high", "MID": "medium", "LOW": "low", "AUTO": "auto"}
# 우리 시스템 의미 모드 → SmartThings airConditionerMode
_MODE_MAP = {"WIND": "wind", "DRY": "dry", "COOL": "cool", "AUTO": "aIComfort", "HEAT": "heat"}


class SmartThingsAdapter:
    """SmartThings REST API 를 ThinQApiMock/Coway 인터페이스로 감싼 에어컨 어댑터."""

    def __init__(self, token: Optional[str] = None, device_id: Optional[str] = None):
        self._token = token or os.getenv("SMARTTHINGS_TOKEN")
        self._device_id = device_id or os.getenv("SMARTTHINGS_AC_DEVICE_ID")
        self._client = None

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

    async def _ensure(self):
        if not self._token:
            raise RuntimeError("SMARTTHINGS_TOKEN 미설정 (.env 확인)")
        if self._client is None:
            import httpx  # 지연 import

            self._client = httpx.AsyncClient(base_url=_BASE, timeout=10.0)
        if not self._device_id:
            self._device_id = await self._discover_ac()
        return self._client

    async def _discover_ac(self) -> Optional[str]:
        """기기 목록에서 에어컨 자동 탐색 (deviceId 미지정 시)."""
        client = self._client
        r = await client.get("/devices", headers=self._headers())
        r.raise_for_status()
        for d in r.json().get("items", []):
            caps = {c["id"] for comp in d.get("components", []) for c in comp.get("capabilities", [])}
            if "airConditionerMode" in caps or "thermostatCoolingSetpoint" in caps:
                logger.info("SmartThings 에어컨 탐색: %s (%s)", d.get("label"), d.get("deviceId"))
                return d["deviceId"]
        return None

    async def _command(self, capability: str, command: str, args: Optional[list] = None) -> dict:
        client = await self._ensure()
        if not self._device_id:
            raise RuntimeError("에어컨 device_id 없음 (SmartThings 미등록?)")
        body = {"commands": [{"component": "main", "capability": capability,
                              "command": command, "arguments": args or []}]}
        r = await client.post(f"/devices/{self._device_id}/commands", headers=self._headers(), json=body)
        r.raise_for_status()
        return {"code": r.status_code, "capability": capability, "command": command, "arguments": args or []}

    async def async_post_device_control(self, device_id: str, body: dict) -> dict:
        """ThinQ/Coway 호환 제어 body → SmartThings 명령 변환.

        body 예: {"operation":{"airConOperationMode":"ON"}}, {"airFlow":{"windStrength":"TURBO"}},
                 {"airConMode":{"mode":"WIND"}}, {"temperature":{"target":24}}
        """
        results = []
        op = (body.get("operation") or {})
        mode_b = (body.get("airConMode") or body.get("mode") or {})
        flow = (body.get("airFlow") or {})
        temp_b = (body.get("temperature") or {})

        if "airConOperationMode" in op or "airPurifierOperationMode" in op:
            on = (op.get("airConOperationMode") or op.get("airPurifierOperationMode")) == "ON"
            results.append(await self._command("switch", "on" if on else "off"))
        if mode_b.get("mode"):
            st_mode = _MODE_MAP.get(str(mode_b["mode"]).upper(), "wind")
            results.append(await self._command("airConditionerMode", "setAirConditionerMode", [st_mode]))
        if "windStrength" in flow:
            fan = _WIND_TO_FAN.get(str(flow["windStrength"]).upper(), "auto")
            results.append(await self._command("airConditionerFanMode", "setFanMode", [fan]))
        if temp_b.get("target") is not None:
            results.append(await self._command("thermostatCoolingSetpoint", "setCoolingSetpoint", [temp_b["target"]]))
        return {"code": 200, "message": "OK(SmartThings)", "device_id": self._device_id, "applied": results}

    async def async_get_status(self) -> dict:
        """에어컨 상태 — 전원/모드/설정온도/풍량/실내온도."""
        client = await self._ensure()
        if not self._device_id:
            return {"available": False, "reason": "에어컨 device_id 없음"}
        r = await client.get(f"/devices/{self._device_id}/status", headers=self._headers())
        r.raise_for_status()
        main = r.json().get("components", {}).get("main", {})

        def val(cap, attr):
            return main.get(cap, {}).get(attr, {}).get("value")

        return {
            "available": True,
            "is_on": val("switch", "switch") == "on",
            "mode": val("airConditionerMode", "airConditionerMode"),
            "set_temp": val("thermostatCoolingSetpoint", "coolingSetpoint"),
            "room_temp": val("temperatureMeasurement", "temperature"),
            "fan_mode": val("airConditionerFanMode", "fanMode"),
        }

    # 편의 메서드 (거버넌스에서 직접 호출)
    async def async_power(self, on: bool) -> dict:
        return await self._command("switch", "on" if on else "off")

    async def async_set_mode(self, mode: str) -> dict:
        return await self._command("airConditionerMode", "setAirConditionerMode",
                                   [_MODE_MAP.get(mode.upper(), "wind")])

    async def async_set_fan(self, wind: str) -> dict:
        return await self._command("airConditionerFanMode", "setFanMode",
                                   [_WIND_TO_FAN.get(wind.upper(), "auto")])

    async def close(self):
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:  # noqa: BLE001
                pass
