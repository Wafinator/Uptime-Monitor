import { describe, it, expect, vi } from "vitest";

// monitorsController pulls pool in at the top. We're only testing the pure
// isValidUrl helper so a stub module is enough.
vi.mock("../db/pool.js", () => ({ pool: { query: vi.fn() } }));

const { isValidUrl } = await import("./monitorsController.js");

describe("isValidUrl", () => {
  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("accepts URLs with ports and paths", () => {
    expect(isValidUrl("https://example.com:8080/health?ok=1")).toBe(true);
  });

  it("rejects ftp URLs (we only monitor web endpoints)", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  it("rejects file:// URLs (would let users read local files)", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects garbage strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("example.com")).toBe(false);
  });

  it("rejects empty / nullish input", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl(undefined)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidUrl(42)).toBe(false);
    expect(isValidUrl({})).toBe(false);
    expect(isValidUrl(["https://example.com"])).toBe(false);
  });
});
