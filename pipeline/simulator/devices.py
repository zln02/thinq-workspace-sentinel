"""ThinQ 가전 8종 물리 시뮬레이터.

요양병원 도메인 기준 — 4계절 시나리오 (겨울 보일러·여름 에어컨·장마 제습·노로 청소).
실제 가전 없이 동작 · ThinQ Connect SDK Mock 어댑터와 1:1 매핑.

수식 근거:
  - 공기청정기 CADR 감쇠: ASHRAE 62.1, 1-zone well-mixed
  - 환기율 ACH: REHVA COVID-19 guidance v4.1
  - 가습/제습 1차 수렴: ISO 16000-29 RH 동특성
  - 노로 표면 살균: WHO HCAI Surface Disinfection Guideline
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from math import exp


class DeviceType(str, Enum):
    AIR_PURIFIER = "AIR_PURIFIER"
    AIR_CONDITIONER = "AIR_CONDITIONER"
    VENTILATOR = "VENTILATOR"
    HUMIDIFIER = "HUMIDIFIER"
    DEHUMIDIFIER = "DEHUMIDIFIER"
    BOILER = "BOILER"
    ROBOT_CLEANER = "ROBOT_CLEANER"
    STYLER = "STYLER"


@dataclass
class DeviceState:
    device_id: str
    device_type: DeviceType
    alias: str
    power: bool = False
    settings: dict = field(default_factory=dict)


class Device:
    def __init__(self, device_id: str, alias: str):
        self.device_id = device_id
        self.alias = alias
        self.state = DeviceState(device_id, self.device_type, alias)

    @property
    def device_type(self) -> DeviceType:
        raise NotImplementedError

    def apply_control(self, body: dict) -> None:
        self.state.settings.update(body)
        op = body.get("operation", {})
        if "airConOperationMode" in op:
            self.state.power = op["airConOperationMode"] != "OFF"
        elif "boilerOperationMode" in op:
            self.state.power = op["boilerOperationMode"] != "OFF"
        elif "cleanOperationMode" in op:
            self.state.power = op["cleanOperationMode"] != "OFF"
        elif "stylerCourse" in op:
            self.state.power = op["stylerCourse"] != "OFF"
        elif body:
            self.state.power = True

    def step(self, dt_min: float, env) -> None:
        raise NotImplementedError


class AirPurifier(Device):
    device_type = DeviceType.AIR_PURIFIER
    CADR_BY_STRENGTH = {"LOW": 200, "MED": 600, "HIGH": 1000, "TURBO": 1150}

    def step(self, dt_min, env):
        if not self.state.power:
            return
        strength = self.state.settings.get("airFlow", {}).get("windStrength", "MED")
        cadr = self.CADR_BY_STRENGTH.get(strength, 600)
        decay = exp(-cadr / env.volume_m3 / 60 * dt_min)
        env.pm25 *= decay
        env.virus_conc *= decay


class AirConditioner(Device):
    device_type = DeviceType.AIR_CONDITIONER

    def step(self, dt_min, env):
        if not self.state.power:
            return
        op = self.state.settings.get("operation", {}).get("airConOperationMode", "COOL")
        target = self.state.settings.get("temperature", {}).get("targetTemperature", 26)
        env.temp_c += (target - env.temp_c) * 0.3 * (dt_min / 10)
        if op in ("COOL", "AIR"):
            env.rh = max(env.rh - 0.5 * (dt_min / 10), 30)
        if self.state.settings.get("airFlow", {}).get("ventilation"):
            env.fresh_air_ach = max(env.fresh_air_ach, 1.0)


class Ventilator(Device):
    """환기청정기 — Wells-Riley Q 직접 제어 핵심 가전."""
    device_type = DeviceType.VENTILATOR
    ACH_BY_RATE = {"OFF": 0, "MIN": 2, "MED": 4, "MAX": 8}

    def step(self, dt_min, env):
        rate = self.state.settings.get("ventilation", {}).get("ventRate", "MIN") if self.state.power else "OFF"
        ach = self.ACH_BY_RATE.get(rate, 2)
        env.fresh_air_ach = max(env.fresh_air_ach, ach)
        if ach > 0:
            decay = exp(-ach / 60 * dt_min)
            env.co2 = env.co2_outdoor + (env.co2 - env.co2_outdoor) * decay
            env.virus_conc *= decay


class Humidifier(Device):
    device_type = DeviceType.HUMIDIFIER

    def step(self, dt_min, env):
        if not self.state.power:
            return
        target = self.state.settings.get("humidification", {}).get("targetHumidity", 50)
        if env.rh < target:
            env.rh += (target - env.rh) * 0.2 * (dt_min / 10)


class Dehumidifier(Device):
    device_type = DeviceType.DEHUMIDIFIER

    def step(self, dt_min, env):
        if not self.state.power:
            return
        target = self.state.settings.get("humidification", {}).get("targetHumidity", 50)
        if env.rh > target:
            env.rh -= (env.rh - target) * 0.2 * (dt_min / 10)
            env.surface_contam *= exp(-0.05 * dt_min / 60)


class Boiler(Device):
    """보일러 — 겨울 노인 저체온증 + 인플루엔자 시즌 핵심."""
    device_type = DeviceType.BOILER

    def step(self, dt_min, env):
        if not self.state.power:
            return
        target = self.state.settings.get("temperature", {}).get("targetTemperature", 22)
        if env.temp_c < target:
            env.temp_c += (target - env.temp_c) * 0.25 * (dt_min / 10)


class RobotCleaner(Device):
    """로봇청소기 — 노로·CDI 표면 살균."""
    device_type = DeviceType.ROBOT_CLEANER
    RATE_BY_MODE = {"NORMAL": 0.1, "STERILIZE": 0.4, "TURBO": 0.5}

    def step(self, dt_min, env):
        if not self.state.power:
            return
        mode = self.state.settings.get("operation", {}).get("cleanOperationMode", "NORMAL")
        rate = self.RATE_BY_MODE.get(mode, 0.1)
        env.surface_contam *= exp(-rate / 60 * dt_min)


class Styler(Device):
    """스타일러 — 옴·요양보호사 출퇴근 의류 살균."""
    device_type = DeviceType.STYLER

    def step(self, dt_min, env):
        if not self.state.power:
            return
        course = self.state.settings.get("operation", {}).get("stylerCourse", "REFRESH")
        if course in ("STERILIZE", "TRUE_STEAM"):
            env.surface_contam *= exp(-0.3 / 60 * dt_min)


DEVICE_CLASS_MAP = {
    DeviceType.AIR_PURIFIER: AirPurifier,
    DeviceType.AIR_CONDITIONER: AirConditioner,
    DeviceType.VENTILATOR: Ventilator,
    DeviceType.HUMIDIFIER: Humidifier,
    DeviceType.DEHUMIDIFIER: Dehumidifier,
    DeviceType.BOILER: Boiler,
    DeviceType.ROBOT_CLEANER: RobotCleaner,
    DeviceType.STYLER: Styler,
}


def build_nursing_home_pack(space_id: str = "ward_a") -> list[Device]:
    """요양병원 1개 병동의 표준 가전 8종 셋업."""
    return [
        AirPurifier(f"{space_id}_purifier", f"{space_id} 공기청정기"),
        AirConditioner(f"{space_id}_aircon", f"{space_id} 에어컨"),
        Ventilator(f"{space_id}_ventilator", f"{space_id} 환기청정기"),
        Humidifier(f"{space_id}_humidifier", f"{space_id} 가습기"),
        Dehumidifier(f"{space_id}_dehumidifier", f"{space_id} 제습기"),
        Boiler(f"{space_id}_boiler", f"{space_id} 보일러"),
        RobotCleaner(f"{space_id}_cleaner", f"{space_id} 로봇청소기"),
        Styler(f"{space_id}_styler", f"{space_id} 스타일러"),
    ]
