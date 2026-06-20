import { describe, it, expect, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { makeAlertService } = require("./alertService.js");

const baseMonitor = {
  name: "Test Site",
  url: "https://example.com",
  alert_email: "ops@example.com",
};

const baseResult = { statusCode: 500, responseTimeMs: 123 };

// Spin up a fresh service with a stub nodemailer and a fake env object.
function buildService(env = {}) {
  const sendMail = vi.fn().mockResolvedValue({});
  const createTransport = vi.fn(() => ({ sendMail }));
  const { sendDownAlert } = makeAlertService({ createTransport, env });
  return { sendDownAlert, createTransport, sendMail };
}

describe("sendDownAlert", () => {
  it("does nothing when the monitor has no alert_email", async () => {
    const { sendDownAlert, createTransport, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert({ ...baseMonitor, alert_email: null }, baseResult);

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("does nothing when no SMTP/Gmail config is set (graceful no-op)", async () => {
    const { sendDownAlert, createTransport, sendMail } = buildService({});

    await sendDownAlert(baseMonitor, baseResult);

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("uses SMTP_HOST config when set (dev / mailhog)", async () => {
    const { sendDownAlert, createTransport, sendMail } = buildService({
      SMTP_HOST: "mailhog",
      SMTP_PORT: "1025",
    });

    await sendDownAlert(baseMonitor, baseResult);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "mailhog", port: 1025, secure: false })
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("uses Gmail config when EMAIL_USER + EMAIL_PASS are set", async () => {
    const { sendDownAlert, createTransport } = buildService({
      EMAIL_USER: "me@gmail.com",
      EMAIL_PASS: "app-password",
    });

    await sendDownAlert(baseMonitor, baseResult);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        service: "gmail",
        auth: { user: "me@gmail.com", pass: "app-password" },
      })
    );
  });

  it("prefers SMTP_HOST over Gmail when both are set", async () => {
    const { sendDownAlert, createTransport } = buildService({
      SMTP_HOST: "localhost",
      EMAIL_USER: "me@gmail.com",
      EMAIL_PASS: "app-password",
    });

    await sendDownAlert(baseMonitor, baseResult);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost" })
    );
  });

  it("sends an email with the monitor name in the subject", async () => {
    const { sendDownAlert, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert(baseMonitor, baseResult);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        subject: expect.stringContaining("Test Site"),
      })
    );
  });

  it("includes the URL and HTTP status code in the body", async () => {
    const { sendDownAlert, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert(baseMonitor, { statusCode: 503, responseTimeMs: 42 });

    const call = sendMail.mock.calls[0][0];
    expect(call.text).toContain("https://example.com");
    expect(call.text).toContain("HTTP 503");
    expect(call.text).toContain("42 ms");
  });

  it("reports a connection error (null statusCode) clearly in the body", async () => {
    const { sendDownAlert, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert(baseMonitor, { statusCode: null, responseTimeMs: 30 });

    const call = sendMail.mock.calls[0][0];
    expect(call.text).toContain("no response");
    expect(call.text).not.toContain("HTTP null");
  });

  it("caches the transporter (only creates it once across multiple sends)", async () => {
    const { sendDownAlert, createTransport, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert(baseMonitor, baseResult);
    await sendDownAlert(baseMonitor, baseResult);
    await sendDownAlert(baseMonitor, baseResult);

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("does not throw if sendMail fails (caught and logged)", async () => {
    const { sendDownAlert, sendMail } = buildService({ SMTP_HOST: "localhost" });
    sendMail.mockRejectedValueOnce(new Error("SMTP exploded"));

    await expect(sendDownAlert(baseMonitor, baseResult)).resolves.toBeUndefined();
  });

  it("falls back to a generic from-address when EMAIL_USER is not set", async () => {
    const { sendDownAlert, sendMail } = buildService({ SMTP_HOST: "localhost" });

    await sendDownAlert(baseMonitor, baseResult);

    const call = sendMail.mock.calls[0][0];
    expect(call.from).toBe("uptime-monitor@localhost");
  });
});
