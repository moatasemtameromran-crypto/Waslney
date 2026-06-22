import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "waslney_secret_change_me";

export interface AdminUser {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminUser;
    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.adminUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
