import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware.js";
import { User } from "../models/User.js";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.token;

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
    // new
    console.log("AUTH DEBUG decoded:", decoded);

    const user = await User.findById(decoded.userId).select("status").lean();

    // new
    console.log("AUTH DEBUG user:", user);

    if (!user) throw new AppError("User no longer exists", 401);

    if (user.status === "blocked") {
      throw new AppError("Account suspended. Please contact support.", 403);
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid or expired token", 401);
  }
};
