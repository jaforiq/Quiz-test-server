import jwt from "jsonwebtoken";
import crypto from "crypto";

const {
  ACCESS_TOKEN_SECRET = "dev_access_secret",
  REFRESH_TOKEN_SECRET = "dev_refresh_secret",
  ACCESS_TOKEN_TTL = "15m",
  REFRESH_TOKEN_TTL = "7d",
} = process.env;

export interface JwtPayload {
  sub: string;
  email: string;
  role?: "admin" | "student";
}


export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
