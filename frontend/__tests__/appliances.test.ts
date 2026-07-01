import {
  APPLIANCES,
  RANK,
  TIER_HEX,
  appOn,
  ROOM_TYPE_LABEL,
  type Tier,
} from "@/lib/appliances";

describe("lib/appliances — tier별 가전 오케스트레이션", () => {
  it("RANK와 TIER_HEX가 5개 티어를 모두 정의한다", () => {
    const tiers: Tier[] = ["MONITOR", "CAUTION", "ALERT", "HIGH_RISK", "CRITICAL"];
    tiers.forEach((t) => {
      expect(RANK[t]).toBeGreaterThanOrEqual(0);
      expect(TIER_HEX[t].c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(TIER_HEX[t].ko.length).toBeGreaterThan(0);
    });
  });

  it("공기청정기(live)는 tier 상승에 따라 대기→자동→급속으로 격상된다", () => {
    const purifier = APPLIANCES.find((a) => a.n === "공기청정기");
    expect(purifier).toBeDefined();
    expect(purifier!.live).toBe(true);
    expect(purifier!.act("MONITOR")).toBe("대기");
    expect(purifier!.act("CAUTION")).toBe("자동");
    expect(purifier!.act("ALERT")).toBe("급속");
    expect(purifier!.act("CRITICAL")).toBe("급속");
  });

  it("로봇청소기는 HIGH_RISK 이상에서만 표면 살균으로 전환된다", () => {
    const robot = APPLIANCES.find((a) => a.n === "로봇청소기")!;
    expect(robot.act("ALERT")).toBe("정기");
    expect(robot.act("HIGH_RISK")).toBe("표면 살균");
    expect(robot.act("CRITICAL")).toBe("표면 살균");
  });

  it("appOn은 동작 상태를 on/off로 올바르게 판정한다", () => {
    expect(appOn("급속")).toBe(true);
    expect(appOn("표면 살균")).toBe(true);
    // 유휴 상태들은 off
    expect(appOn("대기")).toBe(false);
    expect(appOn("유지")).toBe(false);
    expect(appOn("정기")).toBe(false);
    expect(appOn("계절 연동")).toBe(false);
  });

  it("ROOM_TYPE_LABEL이 공간 타입을 한글로 매핑한다", () => {
    expect(ROOM_TYPE_LABEL.WARD).toBe("다인실");
    expect(ROOM_TYPE_LABEL.ISOLATION).toBe("음압격리실");
  });
});
