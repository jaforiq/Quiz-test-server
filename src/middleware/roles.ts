


import { RequestHandler } from "express";
import { User } from "../models/User";  
import type { AuthRequest } from "./auth";

export function requireRole(...roles: ("admin" | "student")[]): RequestHandler {
  return async (req, res, next) => {
    const { user: userJwt } = req as AuthRequest;

    if (!userJwt) { res.status(401).json({ message: "Unauthorized" }); return; }

    let role = userJwt.role;
    if (!role) {
      const dbUser = await User.findById(userJwt.sub).select("role");
      role = dbUser?.role as any;
    }
    if (!role || !roles.includes(role)) {
      res.status(403).json({ message: "Forbidden" }); 
      return;
    }
    next();
  };
}
