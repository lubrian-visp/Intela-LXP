import { describe, it, expect } from "vitest";

/**
 * Assessment module logic tests
 * Tests quiz scoring, peer review assignment, and proctoring violation logic
 */

describe("Quiz Scoring Logic", () => {
  const calculateScore = (answers: { points: number; earned: number }[]) => {
    const total = answers.reduce((sum, a) => sum + a.points, 0);
    const earned = answers.reduce((sum, a) => sum + a.earned, 0);
    return total > 0 ? Math.round((earned / total) * 100) : 0;
  };

  it("calculates perfect score as 100%", () => {
    const answers = [
      { points: 10, earned: 10 },
      { points: 5, earned: 5 },
      { points: 15, earned: 15 },
    ];
    expect(calculateScore(answers)).toBe(100);
  });

  it("calculates zero score correctly", () => {
    const answers = [
      { points: 10, earned: 0 },
      { points: 5, earned: 0 },
    ];
    expect(calculateScore(answers)).toBe(0);
  });

  it("calculates partial score correctly", () => {
    const answers = [
      { points: 10, earned: 7 },
      { points: 10, earned: 3 },
    ];
    expect(calculateScore(answers)).toBe(50);
  });

  it("handles empty answers array", () => {
    expect(calculateScore([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    const answers = [
      { points: 3, earned: 1 },
    ];
    expect(calculateScore(answers)).toBe(33); // 33.33... rounds to 33
  });
});

describe("Peer Review Round-Robin Assignment", () => {
  const generatePairs = (learnerIds: string[], reviewsPerLearner: number) => {
    const pairs: { reviewer: string; reviewee: string }[] = [];
    const n = learnerIds.length;
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= Math.min(reviewsPerLearner, n - 1); j++) {
        pairs.push({
          reviewer: learnerIds[i],
          reviewee: learnerIds[(i + j) % n],
        });
      }
    }
    return pairs;
  };

  it("generates correct number of pairs for 4 learners, 2 reviews each", () => {
    const pairs = generatePairs(["a", "b", "c", "d"], 2);
    expect(pairs).toHaveLength(8); // 4 * 2
  });

  it("ensures no self-review", () => {
    const pairs = generatePairs(["a", "b", "c", "d", "e"], 3);
    pairs.forEach((p) => {
      expect(p.reviewer).not.toBe(p.reviewee);
    });
  });

  it("handles minimum 2 learners", () => {
    const pairs = generatePairs(["a", "b"], 1);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({ reviewer: "a", reviewee: "b" });
    expect(pairs[1]).toEqual({ reviewer: "b", reviewee: "a" });
  });

  it("caps reviews at n-1 when reviewsPerLearner exceeds group size", () => {
    const pairs = generatePairs(["a", "b", "c"], 10);
    expect(pairs).toHaveLength(6); // 3 * 2 (capped at n-1=2)
  });

  it("each learner reviews the correct number of others", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const pairs = generatePairs(ids, 2);
    ids.forEach((id) => {
      const reviewCount = pairs.filter((p) => p.reviewer === id).length;
      expect(reviewCount).toBe(2);
    });
  });

  it("each learner is reviewed by the correct number of others", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const pairs = generatePairs(ids, 2);
    ids.forEach((id) => {
      const reviewedCount = pairs.filter((p) => p.reviewee === id).length;
      expect(reviewedCount).toBe(2);
    });
  });
});

describe("Proctoring Violation Tracking", () => {
  interface Violation {
    type: string;
    severity: "warning" | "critical";
    timestamp: string;
  }

  const shouldTerminate = (violations: Violation[], maxViolations: number) => {
    return violations.length >= maxViolations;
  };

  const countBySeverity = (violations: Violation[], severity: string) => {
    return violations.filter((v) => v.severity === severity).length;
  };

  it("does not terminate below threshold", () => {
    const violations: Violation[] = [
      { type: "tab_switch", severity: "warning", timestamp: "2026-01-01T00:00:00Z" },
      { type: "tab_switch", severity: "warning", timestamp: "2026-01-01T00:01:00Z" },
    ];
    expect(shouldTerminate(violations, 5)).toBe(false);
  });

  it("terminates at threshold", () => {
    const violations: Violation[] = Array.from({ length: 5 }, (_, i) => ({
      type: "tab_switch",
      severity: "warning" as const,
      timestamp: `2026-01-01T00:0${i}:00Z`,
    }));
    expect(shouldTerminate(violations, 5)).toBe(true);
  });

  it("counts violations by severity", () => {
    const violations: Violation[] = [
      { type: "tab_switch", severity: "warning", timestamp: "" },
      { type: "fullscreen_exit", severity: "critical", timestamp: "" },
      { type: "tab_switch", severity: "warning", timestamp: "" },
      { type: "paste_attempt", severity: "critical", timestamp: "" },
    ];
    expect(countBySeverity(violations, "warning")).toBe(2);
    expect(countBySeverity(violations, "critical")).toBe(2);
  });
});

describe("Assessment Pass/Fail Logic", () => {
  const determineResult = (score: number, passMark: number | null) => {
    if (passMark === null) return "submitted";
    return score >= passMark ? "passed" : "failed";
  };

  it("passes when score meets pass mark", () => {
    expect(determineResult(75, 75)).toBe("passed");
  });

  it("passes when score exceeds pass mark", () => {
    expect(determineResult(90, 75)).toBe("passed");
  });

  it("fails when score is below pass mark", () => {
    expect(determineResult(50, 75)).toBe("failed");
  });

  it("returns submitted when no pass mark set", () => {
    expect(determineResult(50, null)).toBe("submitted");
  });

  it("handles zero score with zero pass mark", () => {
    expect(determineResult(0, 0)).toBe("passed");
  });

  it("handles 100% pass mark", () => {
    expect(determineResult(99, 100)).toBe("failed");
    expect(determineResult(100, 100)).toBe("passed");
  });
});

describe("Moderation Sampling Logic", () => {
  const shouldSample = (learnerCount: number, threshold: number, samplePct: number, randomValue: number) => {
    if (learnerCount <= threshold) return { sampled: true, reason: "mandatory" };
    if (randomValue < samplePct / 100) return { sampled: true, reason: "random" };
    return { sampled: false, reason: null };
  };

  it("mandatorily samples when learner count <= threshold", () => {
    const result = shouldSample(5, 10, 25, 0.99);
    expect(result.sampled).toBe(true);
    expect(result.reason).toBe("mandatory");
  });

  it("randomly samples above threshold when random value is below percentage", () => {
    const result = shouldSample(50, 10, 25, 0.1);
    expect(result.sampled).toBe(true);
    expect(result.reason).toBe("random");
  });

  it("skips sampling when random value exceeds percentage", () => {
    const result = shouldSample(50, 10, 25, 0.5);
    expect(result.sampled).toBe(false);
  });

  it("samples at exact threshold", () => {
    const result = shouldSample(10, 10, 25, 0.99);
    expect(result.sampled).toBe(true);
    expect(result.reason).toBe("mandatory");
  });
});
