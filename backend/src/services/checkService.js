const axios = require("axios");

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Pings a URL and reports whether it is up or down.
 *
 * "Up" = the server responded with a 2xx status within the timeout.
 * Anything else (3xx/4xx/5xx, DNS failure, connection refused, timeout) = "down".
 *
 * The HTTP client is injectable to keep tests fast and offline.
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @param {{ get: Function }} [httpClient]
 * @returns {Promise<{status: 'up'|'down', statusCode: number|null, responseTimeMs: number}>}
 */
async function checkUrl(url, timeoutMs = DEFAULT_TIMEOUT_MS, httpClient = axios) {
  const start = Date.now();
  try {
    const res = await httpClient.get(url, {
      timeout: timeoutMs,
      // Don't throw on non-2xx; we want to inspect the status ourselves.
      validateStatus: () => true,
      // Follow redirects but cap them.
      maxRedirects: 5,
      headers: { "User-Agent": "uptime-monitor/1.0" },
    });

    const responseTimeMs = Date.now() - start;
    const isUp = res.status >= 200 && res.status < 300;

    return {
      status: isUp ? "up" : "down",
      statusCode: res.status,
      responseTimeMs,
    };
  } catch (err) {
    // Timeout, DNS error, connection refused, etc. — no HTTP status available.
    return {
      status: "down",
      statusCode: null,
      responseTimeMs: Date.now() - start,
    };
  }
}

module.exports = { checkUrl, DEFAULT_TIMEOUT_MS };
