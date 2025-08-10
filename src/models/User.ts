
import mongoose, { Schema, Document } from "mongoose";

export type Role = "admin" | "student";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: Role;
  isEmailVerified: boolean;

  // refresh token (you already have these)
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;

  // OTP for email verification
  otpHash?: string;
  otpExpiresAt?: Date;
  otpResendAfter?: Date; // throttle resends

  // password reset
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  phone?: string; // optional if you want SMS OTP
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    role:             { type: String, enum: ["admin", "student"], default: "student" },
    isEmailVerified:  { type: Boolean, default: false },

    refreshTokenHash: { type: String },
    refreshTokenExpiresAt: { type: Date },

    otpHash: { type: String },
    otpExpiresAt: { type: Date },
    otpResendAfter: { type: Date },

    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },

    phone: { type: String }
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUser>("User", UserSchema);
