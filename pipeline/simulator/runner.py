"""시뮬레이션 통합 실행기 — 시나리오 1개를 N분 돌리고 결과 출력.

사용:
    python -m pipeline.simulator.runner --scenario summer_norovirus --minutes 120
"""
from __future__ import annotations

import argparse
import asyncio
import json

from backend.services.smart_protocol import execute_protocol
from backend.services.thinq_mock import ThinQApiMock
from pipeline.simulator.devices import build_nursing_home_pack
from pipeline.simulator.sensors import build_nursing_home_sensors
from pipeline.simulator.space import SpaceEnv, default_space, seed_scenario

SCENARIO_SEASON = {
    "winter_influenza": "winter",
    "spring_tb": "spring",
    "summer_norovirus": "summer",
    "autumn_covid": "autumn",
    "heatwave_norovirus_double": "summer",
}


async def run(scenario: str, minutes: int = 120, dt: float = 1.0, verbose: bool = False,
              space: SpaceEnv | None = None) -> dict:
    # space 미주입 시 fallback 팩토리 사용 (CLI/스모크는 DB 없이 기본 체적).
    # API(/simulate)는 DB에서 읽은 실제 병동 체적을 주입한다 → SSE와 일치.
    space = space or default_space("ward_a")
    devices = build_nursing_home_pack("ward_a")
    sensors = build_nursing_home_sensors("ward_a")
    api = ThinQApiMock(devices)
    season = SCENARIO_SEASON.get(scenario, "summer")

    seed_scenario(space, scenario)

    initial = space.snapshot(sensors)

    # 시작 시 Smart Protocol 1회 적용
    tier0 = space.tier()
    proto = await execute_protocol(api, devices, space.pathogen, tier0, season)

    history = []
    steps = int(minutes / dt)
    for i in range(steps):
        space.step(dt, devices)
        if i % 10 == 0:
            snap = space.snapshot(sensors)
            history.append({"t": snap["t_min"], "poi": snap["poi"], "tier": snap["tier"],
                            "co2": snap["co2"], "rh": snap["rh"], "temp": snap["temp_c"]})

    final = space.snapshot(sensors)

    result = {
        "scenario": scenario,
        "season": season,
        "minutes": minutes,
        "initial": initial,
        "protocol_applied": proto,
        "final": final,
        "history_samples": history[::max(1, len(history)//6)],
    }
    if verbose:
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--scenario", default="summer_norovirus",
                   choices=list(SCENARIO_SEASON.keys()))
    p.add_argument("--minutes", type=int, default=120)
    p.add_argument("--dt", type=float, default=1.0)
    args = p.parse_args()
    asyncio.run(run(args.scenario, args.minutes, args.dt, verbose=True))


if __name__ == "__main__":
    main()
