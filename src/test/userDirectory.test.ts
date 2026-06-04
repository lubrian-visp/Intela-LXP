import { describe, it, expect } from "vitest";
import {
  getUserAuthorityLevel,
  getVisibleRoles,
  getOversightTargetRoles,
  hasDirectoryAccess,
  ROLE_AUTHORITY,
  ROLE_LABELS,
} from "@/hooks/useUserDirectory";

describe("getUserAuthorityLevel", () => {
  it("returns highest authority from multiple roles", () => {
    expect(getUserAuthorityLevel(["learner", "facilitator"])).toBe(40);
  });

  it("returns 100 for super_admin", () => {
    expect(getUserAuthorityLevel(["super_admin"])).toBe(100);
  });

  it("returns 0 for empty roles", () => {
    expect(getUserAuthorityLevel([])).toBe(0);
  });

  it("returns 0 for unknown roles", () => {
    expect(getUserAuthorityLevel(["unknown_role"])).toBe(0);
  });

  it("picks highest when mixed known/unknown", () => {
    expect(getUserAuthorityLevel(["unknown", "operations"])).toBe(70);
  });
});

describe("getVisibleRoles", () => {
  it("super_admin can see all other roles", () => {
    const visible = getVisibleRoles(["super_admin"]);
    expect(visible).toContain("systems_admin");
    expect(visible).toContain("learner");
    expect(visible).not.toContain("super_admin");
  });

  it("operations can see roles below authority 70", () => {
    const visible = getVisibleRoles(["operations"]);
    expect(visible).toContain("programme_manager");
    expect(visible).toContain("learner");
    expect(visible).not.toContain("super_admin");
    expect(visible).not.toContain("systems_admin");
    expect(visible).not.toContain("operations");
  });

  it("learner can see no roles (lowest authority)", () => {
    const visible = getVisibleRoles(["learner"]);
    expect(visible).toHaveLength(0);
  });

  it("programme_manager can see roles below 60", () => {
    const visible = getVisibleRoles(["programme_manager"]);
    expect(visible).toContain("facilitator");
    expect(visible).toContain("learner");
    expect(visible).not.toContain("programme_manager");
    expect(visible).not.toContain("operations");
  });
});

describe("getOversightTargetRoles", () => {
  it("super_admin oversees systems_admin and operations", () => {
    const targets = getOversightTargetRoles(["super_admin"]);
    expect(targets).toEqual(["systems_admin", "operations"]);
  });

  it("operations oversees programme_manager", () => {
    const targets = getOversightTargetRoles(["operations"]);
    expect(targets).toEqual(["programme_manager"]);
  });

  it("learner has no oversight targets", () => {
    expect(getOversightTargetRoles(["learner"])).toEqual([]);
  });

  it("facilitator has no oversight targets", () => {
    expect(getOversightTargetRoles(["facilitator"])).toEqual([]);
  });
});

describe("hasDirectoryAccess", () => {
  it("grants access to super_admin", () => {
    expect(hasDirectoryAccess(["super_admin"])).toBe(true);
  });

  it("grants access to systems_admin", () => {
    expect(hasDirectoryAccess(["systems_admin"])).toBe(true);
  });

  it("grants access to administrator", () => {
    expect(hasDirectoryAccess(["administrator"])).toBe(true);
  });

  it("grants access to operations", () => {
    expect(hasDirectoryAccess(["operations"])).toBe(true);
  });

  it("grants access to programme_manager", () => {
    expect(hasDirectoryAccess(["programme_manager"])).toBe(true);
  });

  it("denies access to facilitator", () => {
    expect(hasDirectoryAccess(["facilitator"])).toBe(false);
  });

  it("denies access to learner", () => {
    expect(hasDirectoryAccess(["learner"])).toBe(false);
  });

  it("grants access when one role qualifies", () => {
    expect(hasDirectoryAccess(["learner", "operations"])).toBe(true);
  });
});

describe("ROLE_AUTHORITY completeness", () => {
  it("has entries for all labelled roles", () => {
    Object.keys(ROLE_LABELS).forEach((role) => {
      expect(ROLE_AUTHORITY[role]).toBeDefined();
    });
  });
});
