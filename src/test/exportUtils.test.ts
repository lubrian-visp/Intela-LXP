import { describe, it, expect } from "vitest";
import { toCSV } from "@/lib/exportUtils";

describe("toCSV", () => {
  it("generates CSV with headers from column config", () => {
    const data = [
      { name: "Alice", score: 90 },
      { name: "Bob", score: 85 },
    ];
    const columns = [
      { key: "name", label: "Name" },
      { key: "score", label: "Score" },
    ];
    const csv = toCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[0]).toBe('"Name","Score"');
    expect(lines[1]).toBe('"Alice","90"');
    expect(lines[2]).toBe('"Bob","85"');
  });

  it("auto-generates headers from object keys when no columns provided", () => {
    const data = [{ a: 1, b: 2 }];
    const csv = toCSV(data);
    expect(csv.split("\n")[0]).toBe('"a","b"');
  });

  it("returns empty string for empty data", () => {
    expect(toCSV([])).toBe("");
  });

  it("handles null and undefined values", () => {
    const data = [{ name: null, value: undefined }];
    const csv = toCSV(data);
    expect(csv.split("\n")[1]).toBe(',');
  });

  it("escapes double quotes in values", () => {
    const data = [{ text: 'He said "hello"' }];
    const csv = toCSV(data);
    expect(csv.split("\n")[1]).toBe('"He said ""hello"""');
  });
});
