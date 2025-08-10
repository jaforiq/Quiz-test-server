

import { Router } from "express";
import { signUp, login, refresh, logout, getAllUsers } from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { sendOtp, verifyOtp, resendOtp, forgotPassword, resetPassword } from "../controllers/otpController";

const router = Router();

// Auth + users
router.post("/signup", signUp);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Only admin can list all users
router.get("/users", authenticateToken, requireRole("admin"), getAllUsers);

// OTP
router.post("/otp/send", sendOtp);       
router.post("/otp/resend", resendOtp);   
router.post("/otp/verify", verifyOtp);   

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);   

export default router;
