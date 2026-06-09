import rateLimit from "express-rate-limit";

// Global API Limiter (Generous safety net)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 450,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again in 15 minutes.",
  },
});

// Authentication Limiter (Brute-Force & Credential stuffing protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      "Too many login or authentication attempts. Please try again in 15 minutes.",
  },
});

// Resource Limiter (Paid AI & Lambda executor protection)
export const apiAbuseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Rate limit exceeded for AI grading and code parsing. Please wait 15 minutes.",
  },
});
