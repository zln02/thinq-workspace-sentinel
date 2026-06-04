"""공간 환경 모델 + REHVA Wells-Riley 통합 시뮬레이션.

요양병원 1개 병동 = SpaceEnv 인스턴스 1개.
1 step(dt_min) 호출 = (자연 변화 + 가전 영향 + 센서 측정 + PoI 계산)
"""
from __future__ import annotations

from dataclasses import dataclass
from math import exp

from .devices import Device
from .iaq import iaq_exceedances
from .sensors import Sensor, infer_ach_from_co2

# 병원체 quanta 발생율 (q/h) — 학술 평균값
PATHOGEN_QUANTA = {
    "COVID-19": 25.0,      # Buonanno 2020 평균 (변이 JN.1 보수적)
    "INFLUENZA": 67.0,     # Rudnick & Milton 2003
    "RSV": 6.0,            # CDC 2024 추정
    "TB": 13.0,            # Riley 1962
    "NOROVIRUS": 1.0,      # 호흡기 전파 비중 낮음 (주: fomite)
    "PNEUMOCOCCUS": 4.0,   # 추정
}


@dataclass
class SpaceEnv:
    """공간 환경 — 가전/센서가 공유하는 단일 상태."""
    space_id: str
    volume_m3: float = 400.0  # 6m × 12m × 5.5m 표준 요양 병동
    occupancy: int = 8  # 6인실 + 보호자 2

    temp_c: float = 22.0
    rh: float = 45.0
    co2: float = 600.0
    co2_outdoor: float = 420.0
    pm25: float = 25.0
    outdoor_pm25: float = 35.0

    virus_conc: float = 1.0  # 정규화된 quanta 농도 (1 = 초기치)
    surface_contam: float = 0.1  # 0~1 표면 오염도

    fresh_air_ach: float = 0.5  # 누기 기본

    pathogen: str = "COVID-19"
    infected_count: int = 0

    breathing_rate: float = 0.36  # m³/h (성인 좌식)
    mask_efficiency: float = 0.0

    t_min: float = 0.0

    def step(self, dt_min: float, devices: list[Device]):
        # 1) 자연 인체 발생 — CO2
        co2_gen = self.occupancy * 0.288 * 1e6 / self.volume_m3
        self.co2 += co2_gen * dt_min / 60
        # 2) 누기 환기 제거
        decay = exp(-self.fresh_air_ach / 60 * dt_min)
        self.co2 = self.co2_outdoor + (self.co2 - self.co2_outdoor) * decay
        # 3) 외기 PM 일부 유입
        self.pm25 = self.pm25 * 0.99 + self.outdoor_pm25 * 0.01
        # 4) 감염자 quanta 방출 (Wells-Riley)
        if self.infected_count > 0:
            q = PATHOGEN_QUANTA.get(self.pathogen, 25.0)
            emission_rate = self.infected_count * q / self.volume_m3
            self.virus_conc += emission_rate * dt_min / 60
        # 5) 자연 비활성화 (1차 감쇠 k=0.6/h)
        self.virus_conc *= exp(-0.6 / 60 * dt_min)
        # 6) 가전 영향
        self.fresh_air_ach = 0.5
        for d in devices:
            d.step(dt_min, self)
        # 7) 시간 갱신
        self.t_min += dt_min

    def poi(self, exposure_min: float = 60) -> float:
        """Wells-Riley 감염 확률 (1 - exp(-dose))."""
        if self.virus_conc <= 0 or self.occupancy <= 0:
            return 0.0
        dose = (self.virus_conc * self.breathing_rate * (1 - self.mask_efficiency)
                * exposure_min / 60)
        return 1 - exp(-dose)

    def r_event(self, exposure_min: float = 60) -> float:
        """이벤트 재생산수 = PoI × 노출 인원."""
        susceptible = max(0, self.occupancy - self.infected_count)
        return self.poi(exposure_min) * susceptible

    def tier(self) -> str:
        """5-Tier 분류 — Kim et al. 2025 (Applied Sciences 15:9145).

        2축 (PoI × R_event) 중 더 엄격한 쪽으로 결정.
        """
        poi_val = self.poi()
        r = self.r_event()
        if poi_val < 0.01 and r < 0.5:
            return "MONITOR"
        if poi_val < 0.05 and r < 1.0:
            return "CAUTION"
        if poi_val < 0.15 and r < 2.0:
            return "ALERT"
        if poi_val < 0.30 and r < 3.0:
            return "HIGH_RISK"
        return "CRITICAL"

    def snapshot(self, sensors: list[Sensor]) -> dict:
        readings = [s.read(self, self.t_min) for s in sensors]
        return {
            "space_id": self.space_id,
            "t_min": round(self.t_min, 1),
            "temp_c": round(self.temp_c, 2),
            "rh": round(self.rh, 1),
            "co2": round(self.co2, 0),
            "pm25": round(self.pm25, 1),
            "occupancy": self.occupancy,
            "volume_m3": round(self.volume_m3, 1),
            "virus_conc": round(self.virus_conc, 4),
            "surface_contam": round(self.surface_contam, 3),
            "fresh_air_ach": round(self.fresh_air_ach, 2),
            "inferred_ach": infer_ach_from_co2(self.co2, self.co2_outdoor, self.occupancy, self.volume_m3),
            "pathogen": self.pathogen,
            "infected_count": self.infected_count,
            "poi": round(self.poi(), 4),
            "r_event": round(self.r_event(), 3),
            "tier": self.tier(),
            "iaq_over": iaq_exceedances(co2=self.co2, pm25=self.pm25),
            "sensors": [
                {"id": r.sensor_id, "type": r.sensor_type.value, "value": round(r.value, 2), "unit": r.unit}
                for r in readings
            ],
        }


def seed_scenario(env: SpaceEnv, scenario: str) -> None:
    """시연 시나리오 초기 조건 설정."""
    if scenario == "winter_influenza":
        env.temp_c, env.rh = 18.0, 32.0
        env.pathogen, env.infected_count = "INFLUENZA", 1
    elif scenario == "summer_norovirus":
        env.temp_c, env.rh = 30.0, 75.0
        env.outdoor_pm25 = 55.0
        env.pathogen, env.infected_count = "NOROVIRUS", 1
        env.surface_contam = 0.6
    elif scenario == "spring_tb":
        env.temp_c, env.rh = 22.0, 45.0
        env.pathogen, env.infected_count = "TB", 1
    elif scenario == "autumn_covid":
        env.temp_c, env.rh = 20.0, 50.0
        env.pathogen, env.infected_count = "COVID-19", 1
    elif scenario == "heatwave_norovirus_double":
        env.temp_c, env.rh = 35.0, 70.0
        env.outdoor_pm25 = 65.0
        env.pathogen, env.infected_count = "NOROVIRUS", 2
        env.surface_contam = 0.5


def space_env_from_row(row, space_id: str | None = None) -> SpaceEnv:
    """DB `sentinel.spaces` 레코드(dict/Record)로 SpaceEnv를 구성.

    실제 병동 체적(volume_m3)·정원(max_occupancy)을 시뮬레이터에 주입한다.
    row 가 None 이거나 값이 없으면 SpaceEnv 기본값(하드코딩 fallback)을 쓴다.
    """
    if not row:
        return SpaceEnv(space_id=space_id or "ward_a")
    name = row.get("space_name") or row.get("id")
    volume = row.get("volume_m3")
    occ = row.get("max_occupancy")
    env = SpaceEnv(space_id=space_id or str(name))
    if volume:
        env.volume_m3 = float(volume)
    if occ:
        env.occupancy = int(occ)
    return env
