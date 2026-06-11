#!/usr/bin/env python3
"""다병동 센서 ingest 부하테스트 — p95<500ms (조달 SW 품질목표) 검증.

여러 병동(space_id)에서 동시에 센서 reading 을 POST 하고 지연 분포를 측정한다.
실DB 적재 + tier 계산 + (코웨이 캐시 조회) 전체 경로 포함.

사용:
  python3 tools/loadtest.py --n 500 --concurrency 25
  python3 tools/loadtest.py --url http://127.0.0.1:8003 --wards 5 --n 1000 -c 50
"""
from __future__ import annotations

import argparse
import asyncio
import statistics
import time

import httpx


def _payload(i: int, wards: int) -> dict:
    """정상 범위 센서값(트리거 없음 → 코웨이 제어 미발동, 순수 ingest 경로 측정)."""
    ward = f"ward_{chr(ord('a') + (i % wards))}"
    return {
        "space_id": ward,
        "device_id": f"loadtest-{i % wards}",
        "temp_c": 22.0 + (i % 5) * 0.3,
        "humidity": 45.0 + (i % 10),
        "gas_raw": 80 + (i % 30),
    }


async def _one(client: httpx.AsyncClient, url: str, body: dict) -> tuple[float, int]:
    t0 = time.perf_counter()
    try:
        r = await client.post(url, json=body, timeout=10.0)
        return (time.perf_counter() - t0) * 1000.0, r.status_code
    except Exception:  # noqa: BLE001
        return (time.perf_counter() - t0) * 1000.0, 0


async def run(base: str, n: int, concurrency: int, wards: int) -> dict:
    url = base.rstrip("/") + "/api/v1/sensor/reading"
    sem = asyncio.Semaphore(concurrency)
    lats: list[float] = []
    codes: list[int] = []

    async with httpx.AsyncClient() as client:
        async def task(i: int):
            async with sem:
                lat, code = await _one(client, url, _payload(i, wards))
                lats.append(lat)
                codes.append(code)

        wall0 = time.perf_counter()
        await asyncio.gather(*(task(i) for i in range(n)))
        wall = time.perf_counter() - wall0

    lats.sort()
    ok = sum(1 for c in codes if c == 200)

    def pct(p: float) -> float:
        if not lats:
            return 0.0
        k = min(len(lats) - 1, int(round(p / 100 * (len(lats) - 1))))
        return lats[k]

    return {
        "requests": n, "concurrency": concurrency, "wards": wards,
        "ok": ok, "errors": n - ok,
        "wall_s": round(wall, 2),
        "throughput_rps": round(n / wall, 1) if wall else 0,
        "p50_ms": round(pct(50), 1),
        "p95_ms": round(pct(95), 1),
        "p99_ms": round(pct(99), 1),
        "max_ms": round(lats[-1], 1) if lats else 0,
        "mean_ms": round(statistics.fmean(lats), 1) if lats else 0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8003")
    ap.add_argument("--n", type=int, default=500)
    ap.add_argument("-c", "--concurrency", type=int, default=25)
    ap.add_argument("--wards", type=int, default=5)
    ap.add_argument("--p95-target", type=float, default=500.0)
    a = ap.parse_args()

    res = asyncio.run(run(a.url, a.n, a.concurrency, a.wards))
    print("\n=== 다병동 센서 ingest 부하테스트 ===")
    for k, v in res.items():
        print(f"  {k:16}: {v}")
    target = a.p95_target
    verdict = "PASS ✅" if res["p95_ms"] <= target and res["errors"] == 0 else "FAIL ❌"
    print(f"\n  목표 p95 < {target}ms · 에러 0  →  {verdict}")
    return 0 if verdict.startswith("PASS") else 1


if __name__ == "__main__":
    raise SystemExit(main())
