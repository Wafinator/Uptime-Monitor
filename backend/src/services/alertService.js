const nodemailer = require("nodemailer");

/**
 * Build an alert service.
 *
 * @param {{ createTransport?: Function, env?: NodeJS.ProcessEnv }} [deps]
 * Both are injectable for tests; production code calls makeAlertService()
 * with no args and gets the real nodemailer + process.env.
 */
function makeAlertService(deps = {}) {
  const createTransport = deps.createTransport || nodemailer.createTransport;
  const env = deps.env || process.env;

  let transporter = null;

  // Lazily create a single transporter.
  //
  // Two modes:
  //   1. SMTP_HOST set        → connect to that host (e.g. mailhog in dev).
  //   2. EMAIL_USER+EMAIL_PASS → use Gmail (prod / real alerts).
  //
  // Returns null if neither is configured.
  function getTransporter() {
    if (transporter) return transporter;

    if (env.SMTP_HOST) {
      transporter = createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT, 10) || 1025,
        secure: false,
        ignoreTLS: true,
      });
      return transporter;
    }

    if (env.EMAIL_USER && env.EMAIL_PASS) {
      transporter = createTransport({
        service: "gmail",
        auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
      });
      return transporter;
    }

    return null;
  }

  function getFromAddress() {
    return env.EMAIL_USER || "uptime-monitor@localhost";
  }

  /**
   * Sends a "monitor is down" alert. No-op (logged) if email isn't configured
   * or the monitor has no alert_email set.
   */
  async function sendDownAlert(monitor, result) {
    if (!monitor.alert_email) return;

    const tx = getTransporter();
    if (!tx) {
      console.warn(
        `[alert] Email not configured; skipping down alert for "${monitor.name}".`
      );
      return;
    }

    const codeText = result.statusCode ? `HTTP ${result.statusCode}` : "no response (timeout/connection error)";

    try {
      await tx.sendMail({
        from: getFromAddress(),
        to: monitor.alert_email,
        subject: `DOWN: ${monitor.name}`,
        text:
          `Your monitor "${monitor.name}" is DOWN.\n\n` +
          `URL: ${monitor.url}\n` +
          `Result: ${codeText}\n` +
          `Response time: ${result.responseTimeMs} ms\n` +
          `Time: ${new Date().toISOString()}\n`,
      });
      console.log(`[alert] Down alert sent for "${monitor.name}" -> ${monitor.alert_email}`);
    } catch (err) {
      console.error(`[alert] Failed to send alert for "${monitor.name}":`, err.message);
    }
  }

  return { sendDownAlert };
}

// Default singleton — what production code uses.
const defaultService = makeAlertService();

module.exports = {
  sendDownAlert: defaultService.sendDownAlert,
  makeAlertService,
};
