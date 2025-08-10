

// src/lib/mailer.ts
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = process.env.SMTP_PORT?.trim();
const SMTP_SECURE = process.env.SMTP_SECURE?.trim();
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const SMTP_FROM = process.env.SMTP_FROM?.trim();


export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: (SMTP_SECURE?.toLowerCase() === "true") || Number(SMTP_PORT) === 465,
  auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  logger: true,  
  debug: true,            
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export async function verifyMailer() {
  try {
    await mailer.verify();
    console.log("SMTP: ready to send");
  } catch (err) {
    console.error("SMTP verification failed:", err);
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  return mailer.sendMail({ from: SMTP_FROM, to, subject, html });
}
