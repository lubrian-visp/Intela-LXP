import { describe, it, expect } from "vitest";
import { escapeHtml, stripHtml, sanitizeObject, sanitizeUrl } from "@/lib/sanitize";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("removes self-closing tags", () => {
    expect(stripHtml("Line1<br/>Line2")).toBe("Line1Line2");
  });

  it("handles nested tags", () => {
    expect(stripHtml("<div><span>text</span></div>")).toBe("text");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("no tags here")).toBe("no tags here");
  });
});

describe("sanitizeObject", () => {
  it("escapes string values in flat objects", () => {
    const result = sanitizeObject({ name: "<b>bold</b>", age: 25 as unknown as string });
    expect(result.name).toBe("&lt;b&gt;bold&lt;&#x2F;b&gt;");
  });

  it("recursively sanitises nested objects", () => {
    const result = sanitizeObject({
      user: { name: '<script>alert("x")</script>' } as unknown as string,
    });
    expect((result.user as any).name).toContain("&lt;script&gt;");
  });

  it("preserves non-string values", () => {
    const result = sanitizeObject({ count: 42 as unknown as string, active: true as unknown as string });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });
});

describe("sanitizeUrl", () => {
  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("allows mailto URLs", () => {
    expect(sanitizeUrl("mailto:test@example.com")).toBe("mailto:test@example.com");
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>")).toBe("");
  });

  it("resolves relative paths against origin (valid http)", () => {
    // sanitizeUrl uses window.location.origin as base, so relative strings resolve to http:
    const result = sanitizeUrl("not a url at all :::");
    expect(result).toContain("http");
  });
});
