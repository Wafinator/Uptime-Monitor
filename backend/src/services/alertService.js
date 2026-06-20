const nodemailer = require("nodemailer");

/**
 * Build an alert service. Both createTransport and env can be passed in so
 * the tests can swap them out. Production code just calls makeAlertService()
 * with nothing and gets real nodemailer plus real process.env.
 */
function makeAlertService(deps = {}) {
  const createTransport = deps.createTransport || nodemailer.createTransport;
  const env = deps.env || process.env;

  let transporter = null;

  // Build the transporter the first time we need it.
  //
  // Two ways to configure:
  //   SMTP_HOST set                 use that host (mailhog in dev)
  //   EMAIL_USER + EMAIL_PASS set   use Gmail (real alerts)
  //
  // If neither is set we return null and the caller logs and bails. That way
  // the app still runs fine with no email config.
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

  // Fires off a "your site is down" email. Quietly no ops if email isn't
  // set up or the monitor doesn't have an alert_email.
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
      // Don't let a flaky SMTP take down the scheduler.
      console.error(`[alert] Failed to send alert for "${monitor.name}":`, err.message);
    }
  }

  return { sendDownAlert };
}

// Default instance used by the running app.
const defaultService = makeAlertService();

module.exports = {
  sendDownAlert: defaultService.sendDownAlert,
  makeAlertService,
};
