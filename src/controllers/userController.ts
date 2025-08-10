// src/controllers/auth.controller.ts
import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { sendEmail } from "../lib/mailer";
import { generateOtp, hashOtp } from "../lib/otp";
import {
  JwtPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
} from "../lib/jwt";


const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);

async function issueAndSendOtp(user: any, purpose: "verify" | "reset") {
  const otp = generateOtp(6);
  user.otpHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpResendAfter = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
  await user.save();

  const subject = purpose === "verify" ? "Your verification code" : "Your password reset code";
  const html = `<p>Your OTP is <b>${otp}</b>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`;
  await sendEmail(user.email, subject, html);
}


const isProd = process.env.NODE_ENV === "production";
const refreshCookieName = "rt";

const parseMs = (ttl: string) => {
  const m = ttl.match(/^(\d+)([smhd])?$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const v = Number(m[1]);
  const u = (m[2] || "s").toLowerCase();
  const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return v * (mult[u] ?? 1000);
};

const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
const refreshMaxAgeMs = parseMs(REFRESH_TOKEN_TTL);

function setRefreshCookie(res: any, token: string, maxAgeMs: number) {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: maxAgeMs,
  });
}
function clearRefreshCookie(res: any) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
  });
}

export const signUp: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body as { username: string; email: string; password: string; };
    const exists = await User.findOne({ email });
    if (exists) { res.status(409).json({ message: "Email already registered" }); return; }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    res.status(201).json({ message: "User created successfully", user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
console.log("Login hits");
    const { email, password } = req.body as { email: string; password: string };
    const user = await User.findOne({ email });
    if (!user) { res.status(404).json({ message: "User is not registered." }); return; }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) { res.status(401).json({ message: "Invalid password" }); return; }

    // in login:
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    if (!user.isEmailVerified) {
      // auto-send OTP if not present or expired
      await issueAndSendOtp(user, "verify");
      res.status(403).json({ message: "Email not verified. OTP sent." });
      return;
    }

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.refreshTokenHash = sha256(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + refreshMaxAgeMs);
    await user.save();

    setRefreshCookie(res, refreshToken, refreshMaxAgeMs);
    res.status(200).json({ message: "Login successful", token: accessToken, userId: user.id });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

export const refresh: RequestHandler = async (req, res) => {
  try {
    const token = (req as any).cookies?.rt as string | undefined;
    if (!token) { res.status(401).json({ message: "Missing refresh token" }); return; }

    let payload: JwtPayload;
    try { payload = verifyRefreshToken(token); }
    catch { res.status(403).json({ message: "Invalid refresh token" }); return; }

    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash) { res.status(403).json({ message: "Session not found" }); return; }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
      clearRefreshCookie(res);
      user.refreshTokenHash = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
      res.status(403).json({ message: "Refresh token expired" });
      return;
    }

    if (user.refreshTokenHash !== sha256(token)) {
      clearRefreshCookie(res);
      user.refreshTokenHash = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
      res.status(403).json({ message: "Refresh token mismatch" });
      return;
    }

    const newPayload: JwtPayload = { sub: user.id, email: user.email };
    const newAccess = signAccessToken(newPayload);
    const newRefresh = signRefreshToken(newPayload);

    user.refreshTokenHash = sha256(newRefresh);
    user.refreshTokenExpiresAt = new Date(Date.now() + refreshMaxAgeMs);
    await user.save();

    setRefreshCookie(res, newRefresh, refreshMaxAgeMs);
    res.status(200).json({ token: newAccess });
  } catch (error) {
    res.status(500).json({ message: "Error refreshing token", error });
  }
};

export const logout: RequestHandler = async (req, res) => {
  try {
    const token = (req as any).cookies?.rt as string | undefined;
    if (token) {
      try {
        const { sub } = verifyRefreshToken(token);
        const user = await User.findById(sub);
        if (user) {
          user.refreshTokenHash = undefined;
          user.refreshTokenExpiresAt = undefined;
          await user.save();
        }
      } catch {/* ignore */}
    }
    clearRefreshCookie(res);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out", error });
  }
};

export const getAllUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await User.find({}, { username: 1 }).lean();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users", error });
  }
};
