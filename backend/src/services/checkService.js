const axios = require("axios");

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Hit a URL and figure out if it's up or down.
 *
 * Up means we got a 2xx response inside the timeout. Anything else
 * (3xx, 4xx, 5xx, DNS fail, refused, timeout) is down.
 *
 * httpClient is injectable so the unit tests can pass a stub instead of
 * making a real network request.
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
      // Don't throw on non 2xx. We want to look at the status ourselves.
      validateStatus: () => true,
      // Follow redirects but stop at 5 so a redirect loop can't hang us.
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
    // Timeout, DNS error, connection refused, whatever. No HTTP status here.
    return {
      status: "down",
      statusCode: null,
      responseTimeMs: Date.now() - start,
    };
  }
}

module.exports = { checkUrl, DEFAULT_TIMEOUT_MS };
