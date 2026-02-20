import nodemailer from "nodemailer";

const appName = "CNU OJS";

function normalizeBaseUrl(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getBaseUrl() {
  const explicitAppUrl = normalizeBaseUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);

  if (explicitAppUrl) {
    return explicitAppUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  const authUrl = normalizeBaseUrl(process.env.AUTH_URL);

  if (authUrl) {
    return authUrl;
  }

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  );

  if (vercelUrl) {
    return vercelUrl;
  }

  return "http://localhost:3000";
}

function getMailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || `no-reply@cnu-ojs.local`,
  };
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const config = getMailConfig();

  if (!config.host || !config.user || !config.pass) {
    console.warn("[mail] SMTP not configured. Email not sent.");
    console.log(`[mail] To: ${to}`);
    console.log(`[mail] Subject: ${subject}`);
    console.log(text);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = `${appName} - Verify your email`;
  const text = `Welcome to ${appName}. Verify your email by opening this link: ${url}`;
  const html = `<p>Welcome to <strong>${appName}</strong>.</p><p>Verify your email by clicking <a href="${url}">this link</a>.</p><p>If you did not request this, ignore this email.</p>`;

  await sendMail(email, subject, html, text);
}

export async function sendResetPasswordEmail(email: string, token: string) {
  const url = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `${appName} - Reset your password`;
  const text = `Reset your ${appName} password by opening this link: ${url}`;
  const html = `<p>You requested to reset your password.</p><p>Click <a href="${url}">this link</a> to set a new password.</p><p>If you did not request this, ignore this email.</p>`;

  await sendMail(email, subject, html, text);
}
