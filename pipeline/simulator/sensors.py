"""센서 6종 시뮬레이터 — 노이즈 포함 실측 모사.

요양병원 표준 패키지: CO2·재실·온습도·PM2.5·표면 ATP·외기 IAQ
산업안전 옵션: CO·H2S·O2 (밀폐공간)
연구실 옵션: TVOC·HCHO

CO2 ↔ 환기율 역산: ASHRAE 62.1 Appendix B (Persily 방법)
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum


class SensorType(str, Enum):
    CO2 = "CO2"
    OCCUPANCY = "OCCUPANCY"
    TEMP = "TEMP"
    RH = "RH"
    PM25 = "PM25"
    SURFACE_ATP = "SURFACE_ATP"
    OUTDOOR_AQI = "OUTDOOR_AQI"
    CO = "CO"
    H2S = "H2S"
    O2 = "O2"
    TVOC = "TVOC"
    HCHO = "HCHO"


@dataclass
class SensorReading:
    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp_min: float


class Sensor:
    """베이스 — read(env) 호출 시 노이즈 포함 측정값 반환."""
    unit: str = ""
    noise_std: float = 0.0

    def __init__(self, sensor_id: str):
        self.sensor_id = sensor_id

    @property
    def sensor_type(self) -> SensorType:
        raise NotImplementedError

    def measure(self, env) -> float:
        raise NotImplementedError

    def read(self, env, t_min: float = 0.0) -> SensorReading:
        true_value = self.measure(env)
        noisy = true_value + random.gauss(0, self.noise_std)
        return SensorReading(self.sensor_id, self.sensor_type, max(0, noisy), self.unit, t_min)


class CO2Sensor(Sensor):
    """NDIR CO2 — Aranet4 등급. 환기율 Q 역산용 핵심 센서."""
    sensor_type = SensorType.CO2
    unit = "ppm"
    noise_std = 5.0

    def measure(self, env):
        return env.co2


class OccupancySensor(Sensor):
    """mmWave 재실 — Aqara FP2 등급. Wells-Riley N 핵심."""
    sensor_type = SensorType.OCCUPANCY
    unit = "persons"
    noise_std = 0.5

    def measure(self, env):
        return env.occupancy


class TempSensor(Sensor):
    sensor_type = SensorType.TEMP
    unit = "°C"
    noise_std = 0.2

    def measure(self, env):
        return env.temp_c


class HumiditySensor(Sensor):
    sensor_type = SensorType.RH
    unit = "%"
    noise_std = 1.0

    def measure(self, env):
        return env.rh


class PM25Sensor(Sensor):
    sensor_type = SensorType.PM25
    unit = "μg/m³"
    noise_std = 2.0

    def measure(self, env):
        return env.pm25


class SurfaceATPSensor(Sensor):
    """표면 ATP — 노로·CDI 검증 (요양 적정성평가 증빙)."""
    sensor_type = SensorType.SURFACE_ATP
    unit = "RLU"
    noise_std = 10.0

    def measure(self, env):
        return env.surface_contam * 1000


class OutdoorAQISensor(Sensor):
    """외기 IAQ — 에어코리아 API 모사."""
    sensor_type = SensorType.OUTDOOR_AQI
    unit = "μg/m³"
    noise_std = 3.0

    def measure(self, env):
        return env.outdoor_pm25


def build_nursing_home_sensors(space_id: str = "ward_a") -> list[Sensor]:
    """요양병원 1개 병동의 표준 센서 6종."""
    return [
        CO2Sensor(f"{space_id}_co2"),
        OccupancySensor(f"{space_id}_occ"),
        TempSensor(f"{space_id}_temp"),
        HumiditySensor(f"{space_id}_rh"),
        PM25Sensor(f"{space_id}_pm"),
        SurfaceATPSensor(f"{space_id}_atp"),
    ]


def infer_ach_from_co2(co2_indoor: float, co2_outdoor: float, occupancy: int, volume_m3: float) -> float:
    """CO2 → ACH 역산 (Persily, ASHRAE 62.1 Appendix B).

    Q = N * G / (C_in - C_out)  [m³/h]
    G = 인당 CO2 발생량 ≈ 0.288 m³/h (성인 좌식, ASHRAE)
    ACH = Q / V
    """
    if co2_indoor <= co2_outdoor + 10 or occupancy <= 0:
        return 0.0
    g_per_person = 0.288 * 1e6 / volume_m3
    delta_ppm = co2_indoor - co2_outdoor
    ach = occupancy * g_per_person / delta_ppm
    return round(ach, 2)
