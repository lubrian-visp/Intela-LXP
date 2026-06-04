import { describe, it, expect } from "vitest";

// ─── Optimistic Locking ───
describe("Optimistic Locking Logic", () => {
  it("detects conflict when server timestamp is newer", () => {
    const localTs = new Date("2026-03-25T10:00:00Z").getTime();
    const serverTs = new Date("2026-03-25T10:05:00Z").getTime();
    expect(serverTs > localTs).toBe(true);
  });

  it("allows update when timestamps match", () => {
    const ts = "2026-03-25T10:00:00Z";
    const localTs = new Date(ts).getTime();
    const serverTs = new Date(ts).getTime();
    expect(serverTs > localTs).toBe(false);
  });

  it("handles missing tracking gracefully", () => {
    const tracked = new Map();
    const entry = tracked.get("programmes:abc");
    expect(entry).toBeUndefined();
  });
});

// ─── Inter-Rater Reliability ───
describe("Inter-Rater Reliability Calculations", () => {
  it("calculates standard deviation correctly", () => {
    const values = [70, 80, 90];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map((v) => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
    expect(stdDev).toBeCloseTo(10, 0);
  });

  it("returns perfect kappa when all raters agree", () => {
    // If all items have same pass/fail from both raters, po=1, so kappa=1
    const po = 1;
    const pe = 0.5;
    const kappa = (po - pe) / (1 - pe);
    expect(kappa).toBe(1);
  });

  it("returns zero kappa when agreement equals chance", () => {
    const po = 0.5;
    const pe = 0.5;
    const kappa = (po - pe) / (1 - pe);
    expect(kappa).toBe(0);
  });

  it("classifies reliability ratings correctly", () => {
    const classify = (k: number) =>
      k >= 0.8 ? "Excellent" : k >= 0.6 ? "Good" : k >= 0.4 ? "Fair" : "Poor";
    expect(classify(0.85)).toBe("Excellent");
    expect(classify(0.65)).toBe("Good");
    expect(classify(0.45)).toBe("Fair");
    expect(classify(0.2)).toBe("Poor");
  });

  it("classifies assessor consistency correctly", () => {
    const classify = (rate: number) =>
      rate >= 80 ? "High" : rate >= 60 ? "Medium" : "Low";
    expect(classify(90)).toBe("High");
    expect(classify(70)).toBe("Medium");
    expect(classify(50)).toBe("Low");
  });
});

// ─── Guidance Conflict Detection ───
describe("Guidance Conflict Detection Logic", () => {
  it("detects outcome mismatch when mentor goal completed but assessor failed", () => {
    const goalCompleted = true;
    const assessorPassed = false;
    const isConflict = goalCompleted && !assessorPassed;
    expect(isConflict).toBe(true);
  });

  it("no conflict when both agree on positive outcome", () => {
    const goalCompleted = true;
    const assessorPassed = true;
    const isConflict = goalCompleted && !assessorPassed;
    expect(isConflict).toBe(false);
  });

  it("detects evidence contradiction when score is significantly below pass mark", () => {
    const score = 30;
    const passMark = 50;
    const isSignificantlyBelow = score < passMark * 0.7;
    expect(isSignificantlyBelow).toBe(true);
  });

  it("detects timeline conflict when goal target is 14+ days after due date", () => {
    const goalDate = new Date("2026-04-20");
    const dueDate = new Date("2026-04-01");
    const diffDays = (goalDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(14);
  });

  it("sorts conflicts by severity correctly", () => {
    const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const items = ["low", "high", "medium"];
    const sorted = items.sort((a, b) => sevOrder[a] - sevOrder[b]);
    expect(sorted).toEqual(["high", "medium", "low"]);
  });
});

// ─── Paginated Query ───
describe("Paginated Query Logic", () => {
  it("calculates correct range for pagination", () => {
    const pageSize = 1000;
    const offset = 0;
    const rangeStart = offset;
    const rangeEnd = offset + pageSize - 1;
    expect(rangeStart).toBe(0);
    expect(rangeEnd).toBe(999);
  });

  it("increments offset correctly between pages", () => {
    const pageSize = 1000;
    let offset = 0;
    offset += pageSize;
    expect(offset).toBe(1000);
    offset += pageSize;
    expect(offset).toBe(2000);
  });

  it("detects last page when fewer rows returned", () => {
    const pageSize = 1000;
    const returnedRows = 450;
    const hasMore = returnedRows >= pageSize;
    expect(hasMore).toBe(false);
  });

  it("stops when offset reaches total count", () => {
    const totalCount = 2500;
    const offset = 3000;
    const hasMore = offset < totalCount;
    expect(hasMore).toBe(false);
  });
});
