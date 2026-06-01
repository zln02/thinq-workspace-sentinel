"""5종 시나리오 시뮬레이션 스모크 테스트 — CI에서 직접 실행."""
import asyncio
import sys


async def main() -> int:
    from pipeline.simulator.runner import SCENARIO_SEASON, run

    fails: list[str] = []
    for s in SCENARIO_SEASON:
        r = await run(s, minutes=120, dt=1.0)
        i_t, f_t = r["initial"]["tier"], r["final"]["tier"]
        i_p, f_p = r["initial"]["poi"], r["final"]["poi"]
        print(f"{s:32} {i_t:>9} -> {f_t:<9}  PoI {i_p:.4f} -> {f_p:.4f}")
        if f_p >= i_p:
            fails.append(f"{s}: PoI 감소 실패")

    if fails:
        print("FAIL:", *fails)
        return 1
    print("OK · 5종 시나리오 모두 PoI 감소")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
