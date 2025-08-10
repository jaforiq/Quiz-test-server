import crypto from "crypto";
import { sha256 } from "./jwt";

export function generateOtp(length = 6) {
  // numeric 6-digit
  const n = crypto.randomInt(0, 10 ** length).toString().padStart(length, "0");
  return n;
}

export function hashOtp(otp: string) {
  return sha256(otp);
}
