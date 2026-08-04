import nodemailer from "nodemailer";
import { env } from "../config/env.js";

//utils/mailer.js
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT), //587
  secure: false, //STARTTLS on 587
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  // Add display name here (keep env strict/plain)
  const from = `SwiftShield Bank Inc.<${env.SMTP_FROM}>`;
  return mailer.sendMail({ from, to, subject, text, html, attachments });
}
