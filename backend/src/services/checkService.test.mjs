import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

// Use createRequire so we load the CJS source without ESM/CJS interop weirdness.
const require = createRequire(import.meta.url);
const { checkUrl, DEFAULT_TIMEOUT_MS } = require("./checkService.js");

// Stub axios. We pass it in per call instead of mocking the module.
function makeStub() {
  return { get: vi.fn() };
}

describe("checkUrl", () => {
  let http;

  beforeEach(() => {
    http = makeStub();
  });

  it("returns 'up' for a 200 response", async () => {
    http.get.mockResolvedValue({ status: 200 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("up");
    expect(result.statusCode).toBe(200);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns 'up' for any 2xx status", async () => {
    http.get.mockResolvedValue({ status: 204 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("up");
    expect(result.statusCode).toBe(204);
  });

  it("returns 'down' for a 3xx final response", async () => {
    http.get.mockResolvedValue({ status: 301 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("down");
    expect(result.statusCode).toBe(301);
  });

  it("returns 'down' for a 404 response", async () => {
    http.get.mockResolvedValue({ status: 404 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("down");
    expect(result.statusCode).toBe(404);
  });

  it("returns 'down' for a 500 response", async () => {
    http.get.mockResolvedValue({ status: 500 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("down");
    expect(result.statusCode).toBe(500);
  });

  it("returns 'down' with null statusCode when the request throws", async () => {
    http.get.mockRejectedValue(new Error("ETIMEDOUT"));
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.status).toBe("down");
    expect(result.statusCode).toBeNull();
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("passes the configured timeout to the http client", async () => {
    http.get.mockResolvedValue({ status: 200 });
    await checkUrl("https://example.com", 3000, http);
    expect(http.get).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ timeout: 3000 })
    );
  });

  it("uses the default timeout when none is provided", async () => {
    http.get.mockResolvedValue({ status: 200 });
    await checkUrl("https://example.com", undefined, http);
    expect(http.get).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS })
    );
  });

  it("sets a User-Agent so target servers can identify us", async () => {
    http.get.mockResolvedValue({ status: 200 });
    await checkUrl("https://example.com", undefined, http);
    expect(http.get).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": expect.stringContaining("uptime-monitor") }),
      })
    );
  });

  it("does not throw on non-2xx (uses validateStatus: () => true)", async () => {
    http.get.mockResolvedValue({ status: 503 });
    const result = await checkUrl("https://example.com", undefined, http);
    expect(result.statusCode).toBe(503);
    expect(http.get).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ validateStatus: expect.any(Function) })
    );
  });
});
