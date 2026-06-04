import { describe, it, expect } from "vitest";
import { maskNationalId } from "@/lib/privacyUtils";

describe("maskNationalId", () => {
  it("masks a standard 13-digit SA ID showing last 4", () => {
    expect(maskNationalId("9001015009087")).toBe("••••••9087");
  });

  it("masks shorter IDs showing last 4", () => {
    expect(maskNationalId("AB12345")).toBe("••••••2345");
  });

  it("returns full mask for null input", () => {
    expect(maskNationalId(null)).toBe("••••••••••");
  });

  it("returns full mask for undefined input", () => {
    expect(maskNationalId(undefined)).toBe("••••••••••");
  });

  it("returns full mask for very short strings", () => {
    expect(maskNationalId("AB")).toBe("••••••••••");
  });

  it("returns full mask for empty string", () => {
    expect(maskNationalId("")).toBe("••••••••••");
  });

  it("handles exactly 4 characters", () => {
    expect(maskNationalId("ABCD")).toBe("••••••ABCD");
  });
});
