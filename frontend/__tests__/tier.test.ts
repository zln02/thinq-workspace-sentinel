import {
  TIER_META,
  TIER_ORDER,
  tierMeta,
  tierRank,
  tierKo,
  isAtRisk,
  isActive,
  isCritical,
  type Tier,
} from "@/lib/tier";

describe("lib/tier — 5단계 위험 티어 분류", () => {
  it("TIER_ORDER는 정상→심각 순서로 rank가 단조 증가한다", () => {
    expect(TIER_ORDER).toEqual([
      "MONITOR",
      "CAUTION",
      "ALERT",
      "HIGH_RISK",
      "CRITICAL",
    ]);
    const ranks = TIER_ORDER.map((t) => TIER_META[t].rank);
    expect(ranks).toEqual([0, 1, 2, 3, 4]);
    // 엄격 증가 확인
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    }
  });

  it("각 티어의 한글 라벨이 정확하다", () => {
    const labels = TIER_ORDER.map((t) => TIER_META[t].label);
    expect(labels).toEqual(["정상", "주의", "경계", "위험", "심각"]);
  });

  it("각 티어는 색·이모지 등 중복 인코딩 필드를 갖는다(WCAG 1.4.1)", () => {
    (Object.keys(TIER_META) as Tier[]).forEach((t) => {
      const m = TIER_META[t];
      expect(m.bg).toMatch(/^bg-tier-/);
      expect(m.fg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(m.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(m.emoji.length).toBeGreaterThan(0);
      expect(m.Icon).toBeDefined();
    });
  });

  it("tierMeta는 미지/누락 티어를 MONITOR로 안전 폴백한다", () => {
    expect(tierMeta("CRITICAL")).toBe(TIER_META.CRITICAL);
    expect(tierMeta("UNKNOWN")).toBe(TIER_META.MONITOR);
    expect(tierMeta(null)).toBe(TIER_META.MONITOR);
    expect(tierMeta(undefined)).toBe(TIER_META.MONITOR);
  });

  it("tierRank / tierKo 헬퍼가 메타와 일치한다", () => {
    expect(tierRank("ALERT")).toBe(2);
    expect(tierRank("bogus")).toBe(0); // MONITOR 폴백
    expect(tierKo("HIGH_RISK")).toBe("위험");
    expect(tierKo(null)).toBe("—"); // null/undefined는 대시
  });

  it("의미 술어(isAtRisk/isActive/isCritical) 경계값이 정확하다", () => {
    // isAtRisk: CAUTION(1) 이상
    expect(isAtRisk("MONITOR")).toBe(false);
    expect(isAtRisk("CAUTION")).toBe(true);
    // isActive: ALERT(2) 이상 → 자동대응
    expect(isActive("CAUTION")).toBe(false);
    expect(isActive("ALERT")).toBe(true);
    // isCritical: CRITICAL(4)에서만 true
    expect(isCritical("HIGH_RISK")).toBe(false);
    expect(isCritical("CRITICAL")).toBe(true);
  });
});
