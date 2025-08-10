
import { Request, RequestHandler } from "express";
import { verifyAccessToken, JwtPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) { res.status(401).json({ message: "Missing Bearer token" }); return; }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthRequest).user = payload;  // <-- cast here
    next();
  } catch {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
