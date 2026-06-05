"""코웨이 IoCare 실기기 어댑터.

`ThinQApiMock` 과 동일한 `async_post_device_control(device_id, body)` 인터페이스를
제공하여, `smart_protocol` 이 벤더 무관하게 가전을 제어하도록 한다.

실증 데모: `ThinQApiMock` → `CowayAdapter` 한 줄 교체로 실제 코웨이 공청기 제어.
계정은 `.env` 의 `COWAY_USERNAME` / `COWAY_PASSWORD` 사용(하드코딩 금지).

센서로도 활용: `async_get_air_quality()` 가 PM2.5/CO2/AQI 실측을 반환하여
실제 공기질을 tier 계산·대시보드 표출 입력으로 쓸 수 있다.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _estimate_power_w(is_on, rapid_mode, fan_speed) -> float:
    """코웨이 API가 소비전력을 제공하지 않아 풍량 단계로 추정(노블 20평형급 정격 기준).

    실측이 필요하면 스마트플러그(tinytuya) 연동으로 교체. 데모에선 '추정' 라벨로 표기.
    """
    if not is_on:
        return 1.0  # 대기전력
    if rapid_mode:
        return 60.0
    return {1: 6.0, 2: 12.0, 3: 22.0, 4: 38.0}.get(fan_speed, 10.0)


class CowayAdapter:
    """cowayaio 를 ThinQApiMock 인터페이스로 감싼 실기기 어댑터."""

    def __init__(self, username: Optional[str] = None, password: Optional[str] = None):
        self._username = username or os.getenv("COWAY_USERNAME")
        self._password = password or os.getenv("COWAY_PASSWORD")
        self._client = None
        self._device_attr: Optional[dict[str, Any]] = None

    async def _ensure(self):
        """지연 로그인 + 첫 공청기 device_attr 캐시."""
        if not self._username or not self._password:
            raise RuntimeError("COWAY_USERNAME/COWAY_PASSWORD 미설정 (.env 확인)")
        if self._client is None:
            from cowayaio import CowayClient  # 지연 import (미설치 환경 보호)

            self._client = CowayClient(self._username, self._password)
            await self._client.login()
            logger.info("Coway 로그인 완료 (country=%s)", self._client.country_code)
        if self._device_attr is None:
            data = await self._client.async_get_purifiers_data()
            purifier = next(iter(data.purifiers.values()))
            self._device_attr = purifier.device_attr
        return self._client, self._device_attr

    async def async_post_device_control(self, device_id: str, body: dict) -> dict:
        """ThinQ 호환 제어 명령을 코웨이 동작으로 변환.

        body 예시:
            {"operation": {"airPurifierOperationMode": "ON"}}
            {"airFlow": {"windStrength": "TURBO"}}
        """
        client, attr = await self._ensure()
        applied: list[str] = []

        operation = body.get("operation", {})
        for key, val in operation.items():
            if "OperationMode" in key:
                if val == "ON":
                    await client.async_set_power(attr, True)
                    applied.append("power:ON")
                elif val == "OFF":
                    await client.async_set_power(attr, False)
                    applied.append("power:OFF")

        wind = body.get("airFlow", {}).get("windStrength")
        if wind in ("TURBO", "HIGH"):
            await client.async_set_rapid_mode(attr)
            applied.append("mode:rapid")
        elif wind in ("LOW", "MED"):
            await client.async_set_auto_mode(attr)
            applied.append("mode:auto")

        logger.info("Coway 제어 적용: %s", applied)
        return {
            "code": 200,
            "message": "OK(Coway)",
            "device_id": device_id,
            "applied": applied,
            "request": body,
        }

    async def async_get_air_quality(self) -> dict:
        """PM2.5/CO2/AQI/전원상태 실측 — 센서 입력 + 대시보드 표출용."""
        client, _ = await self._ensure()
        data = await client.async_get_purifiers_data()
        p = next(iter(data.purifiers.values()))
        return {
            "is_on": p.is_on,
            "auto_mode": p.auto_mode,
            "rapid_mode": p.rapid_mode,
            "fan_speed": p.fan_speed,
            "power_est_w": _estimate_power_w(p.is_on, p.rapid_mode, p.fan_speed),
            "pm25": p.particulate_matter_2_5,
            "pm10": p.particulate_matter_10,
            "co2": p.carbon_dioxide,
            "voc": p.volatile_organic_compounds,
            "aqi": p.air_quality_index,
            "aq_grade": p.aq_grade,
        }

    async def close(self):
        if self._client is not None:
            try:
                await self._client._session.close()
            except Exception:
                pass
