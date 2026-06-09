import express, { type Application } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import skillRoutes from "./modules/skills/skill.routes.js";
import verificationRoutes from "./modules/verification/verification.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import questionRoutes from "./modules/questions/questions.routes.js";
import marketRoutes from "./modules/market/market.routes.js";
import problemRoutes from "./modules/problems/problems.routes.js";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes.js";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";
import {
  apiAbuseLimiter,
  authLimiter,
  globalLimiter,
} from "./middlewares/ratelimiter.middleware.js";

const app: Application = express();

// Health check endpoint for AWS environment monitoring
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Global limiter
app.use("/api", globalLimiter);

// -- Routes --
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/verification", apiAbuseLimiter, verificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// -- Admin Routes --
app.use("/api/admin/questions", questionRoutes);
app.use("/api/market", marketRoutes);

// -- Error Handler --
app.use(errorHandler);

export default app;
