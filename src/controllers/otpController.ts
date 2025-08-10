import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sha256 } from "../lib/jwt";
import { User } from "../models/User";
import { RequestHandler } from "express";
import { sendEmail } from "../lib/mailer";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);

function now() { return Date.now(); }

export const sendOtp: RequestHandler = async (req, res) => {
  try {
  const { email, purpose = "verify" } = req.body as { email: string; purpose?: "verify" | "reset" };
  const user = await User.findOne({ email });
  console.log("Otp user: ", user);
  if (!user) { res.status(200).json({ message: "OTP sent if account exists" }); return; } // do not leak
  // create & send via helper in auth (or write here)
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  user.otpHash = sha256(otp);
  user.otpExpiresAt = new Date(now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpResendAfter = new Date(now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
  await user.save();
  console.log("otp saved in db.");
  const subj = purpose === "verify" ? "Your verification code" : "Your password reset code";
  await sendEmail(
    user.email,
    subj,
    `<p>Your OTP is <b>${otp}</b> (valid ${OTP_TTL_MINUTES} minutes)</p>`
  );
  console.log("Otp sent");
  res.status(200).json({ message: "OTP sent" });
} catch (err) {
  console.error("Failed to send OTP email:", err);
  res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
}
};

export const resendOtp: RequestHandler = async (req, res) => {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  if (!user) { res.status(200).json({ message: "OTP resent if account exists" }); return; }

  if (user.otpResendAfter && user.otpResendAfter.getTime() > now()) {
    const wait = Math.ceil((user.otpResendAfter.getTime() - now()) / 1000);
    res.status(429).json({ message: `Please wait ${wait}s before resending` });
    return;
  }

  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  user.otpHash = sha256(otp);
  user.otpExpiresAt = new Date(now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpResendAfter = new Date(now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
  await user.save();

  await sendEmail(user.email, "Your verification code", `<p>Your OTP is <b>${otp}</b> (valid ${OTP_TTL_MINUTES} minutes)</p>`);
  // if (user.phone) await sendSms(user.phone, `OTP: ${otp} (valid ${OTP_TTL_MINUTES}m)`);

  res.status(200).json({ message: "OTP resent" });
};

export const verifyOtp: RequestHandler = async (req, res) => {
  const { email, code } = req.body as { email: string; code: string };
  const user = await User.findOne({ email });
  if (!user || !user.otpHash || !user.otpExpiresAt) {
    res.status(400).json({ message: "Invalid or expired OTP" });
    return;
  }
  if (user.otpExpiresAt.getTime() < now()) {
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    res.status(400).json({ message: "OTP expired" });
    return;
  }
  if (user.otpHash !== sha256(code)) {
    res.status(400).json({ message: "Incorrect OTP" });
    return;
  }

  // success
  user.isEmailVerified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpResendAfter = undefined;
  await user.save();

  res.status(200).json({ message: "Email verified" });
};

export const forgotPassword: RequestHandler = async (req, res) => {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  if (!user) { res.status(200).json({ message: "If that email exists, reset instructions are sent" }); return; }

  const token = crypto.randomBytes(32).toString("hex");
  user.resetTokenHash = sha256(token);
  user.resetTokenExpiresAt = new Date(now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  await user.save();

  const resetLink = `${process.env.CORS_ORIGIN}/reset-password?uid=${user.id}&token=${token}`;
  await sendEmail(user.email, "Reset your password",
    `<p>Click to reset: <a href="${resetLink}">${resetLink}</a><br/>Valid for ${RESET_TOKEN_TTL_MINUTES} minutes.</p>`);

  res.status(200).json({ message: "If that email exists, reset instructions are sent" });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { uid, token, newPassword } = req.body as { uid: string; token: string; newPassword: string };
  const user = await User.findById(uid);
  if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
    res.status(400).json({ message: "Invalid reset request" });
    return;
  }
  if (user.resetTokenExpiresAt.getTime() < now()) {
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();
    res.status(400).json({ message: "Reset token expired" });
    return;
  }
  if (user.resetTokenHash !== sha256(token)) {
    res.status(400).json({ message: "Invalid reset token" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;

  // Invalidate current sessions (optional but recommended)
  user.refreshTokenHash = undefined;
  user.refreshTokenExpiresAt = undefined;

  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successful" });
};
