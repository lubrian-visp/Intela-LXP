import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name merge)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toContain("active");
  });

  it("filters falsy values", () => {
    expect(cn("base", false, null, undefined, "end")).toBe("base end");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});
