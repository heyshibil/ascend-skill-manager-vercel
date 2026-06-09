import { AppError } from "../../middlewares/error.middleware.js";
import { Question } from "../../models/Question.js";
import { Submission } from "../../models/Submission.js";
import { UserProblemStats } from "../../models/UserProblemStats.js";
import type { RunCodeResult } from "../../types/index.js";
import { invalidateCache } from "../../utils/cache.js";
import { resolveRuntime } from "../../utils/runtimeResolver.js";
import { runCodeTest } from "../verification/compiler.service.js";

// helper: getEffective streak rate
export const getEffectiveStreak = (
  currentStreak: number,
  lastSolvedDate: Date | null,
): number => {
  if (!lastSolvedDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDay = new Date(lastSolvedDate);
  lastDay.setHours(0, 0, 0, 0);

  const diffDays =
    Math.floor(today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays <= 1 ? currentStreak : 0;
};

// -- List all problems with pagination,filters --
export const listProblems = async (
  userId: string,
  query: {
    page?: number;
    limit?: number;
    skill?: string;
    level?: string;
    search?: string;
  },
) => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { type: "code" };

  if (query.skill) {
    filter.skill = query.skill;
  }

  if (query.level) {
    filter.level = query.level;
  }

  if (query.search) {
    filter.$or = [
      { question: { $regex: query.search, $options: "i" } },
      { topic: { $regex: query.search, $options: "i" } },
      { skill: { $regex: query.search, $options: "i" } },
    ];
  }

  const [problems, total] = await Promise.all([
    Question.find(filter, {
      questionId: 1,
      skill: 1,
      level: 1,
      topic: 1,
      question: 1,
    })
      .sort({ skill: 1, level: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  // Get User stats
  const stats = await UserProblemStats.findOne({ userId }).lean();
  const solvedSet = new Set(stats?.solvedQuestionIds || []);

  // Attach solved status
  const enriched = problems.map((p) => ({
    ...p,
    solved: solvedSet.has(p.questionId),
  }));

  return {
    problems: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// -- Get single problem detail --
export const getProblem = async (questionId: string, userId: string) => {
  const problem = await Question.findOne(
    { questionId, type: "code" },
    { correctAnswerIndex: 0 },
  ).lean();

  if (!problem) {
    throw new AppError("Problem not found.", 404);
  }

  // Check user has solved it
  const stats = await UserProblemStats.findOne({ userId }).lean();
  const solvedSet = new Set(
    stats?.solvedQuestionIds.map((id) => id.toString() || []),
  );

  const solved = solvedSet.has(questionId) || false;

  // Get user's last submission for this problem
  const lastSubmission = await Submission.findOne(
    { userId, questionId },
    { code: 1, status: 1, passedCases: 1, totalCases: 1 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return { problem, solved, lastSubmission };
};

// -- Dry Run code --
export const runProblem = async (
  _userId: string,
  questionId: string,
  code: string,
): Promise<RunCodeResult> => {
  const problem = await Question.findOne({ questionId, type: "code" });

  if (!problem || !problem.testCases) {
    throw new AppError("Problem not found or has no test cases.", 404);
  }

  const runtime = resolveRuntime(problem.skill);
  return runCodeTest(code, problem.testCases, runtime);
};

// -- Update stats on accepted submission --
const updateStatsOnAccepted = async (
  userId: string,
  questionId: string,
  level: string,
) => {
  const stats = await UserProblemStats.findOne({ userId });

  // skip for already solved
  if (stats?.solvedQuestionIds.includes(questionId)) return;

  const levelField =
    level === "beginner"
      ? "easySolved"
      : level === "intermediate"
        ? "mediumSolved"
        : "hardSolved";

  // Streak calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streakUpdate: Record<string, any> = {};

  if (stats?.lastSolvedDate) {
    const lastDate = new Date(stats.lastSolvedDate);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      const newStreak = (stats.currentStreak || 0) + 1;
      streakUpdate = {
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak || 0, newStreak),
      };
    } else if (diffDays > 1) {
      // streak broken - reset
      streakUpdate = { currentStreak: 1 };
    }
  } else {
    // first day
    streakUpdate = { currentStreak: 1, longestStreak: 1 };
  }

  await UserProblemStats.findOneAndUpdate(
    { userId },
    {
      $inc: { totalSolved: 1, [levelField]: 1 },
      $addToSet: { solvedQuestionIds: questionId },
      $set: { lastSolvedDate: new Date(), ...streakUpdate },
    },
    { upsert: true },
  );
};

// -- Submit Solution --
export const submitProblem = async (
  userId: string,
  questionId: string,
  code: string,
) => {
  const problem = await Question.findOne({ questionId, type: "code" });

  if (!problem || !problem.testCases) {
    throw new AppError("Problem not found or has no test cases.", 404);
  }

  const runtime = resolveRuntime(problem.skill);
  const start = Date.now();
  const result = await runCodeTest(code, problem.testCases, runtime);
  const executionTimeMs = Date.now() - start;

  let status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit";

  // Determine status
  if (result.timedOut) {
    status = "time_limit";
  } else if (result.passedCases === result.totalCases) {
    status = "accepted";
  } else if (result.results.some((r) => r.actual === "__EXEC_ERROR__")) {
    status = "runtime_error";
  } else {
    status = "wrong_answer";
  }

  const submission = await Submission.create({
    userId,
    questionId,
    code,
    runtime,
    status,
    passedCases: result.passedCases,
    totalCases: result.totalCases,
    executionTimeMs,
  });

  // Update status
  if (status === "accepted") {
    await updateStatsOnAccepted(userId, questionId, problem.level);
    // Invalidate caches - Leaderboard page 1 keys are now user-scoped (uid:${userId}) to prevent rank cross-contamination
    await invalidateCache(
      `dashboard:${userId}`,
      `leaderboard:solved:page1:uid:${userId}`,
      `leaderboard:streak:page1:uid:${userId}`,
    );
  }

  // Always Increment total submissions
  await UserProblemStats.findOneAndUpdate(
    {
      userId,
    },
    { $inc: { totalSubmissions: 1 } },
    { upsert: true },
  );

  return {
    submission: {
      status: submission.status,
      passedCases: submission.passedCases,
      totalCases: submission.totalCases,
      executionTimeMs,
    },
    results: result.results,
  };
};

// -- Get user's problem stats --
export const getUserStats = async (userId: string) => {
  const stats = await UserProblemStats.findOne({ userId }).lean();

  const currentStreak = getEffectiveStreak(
    stats?.currentStreak || 0,
    stats?.lastSolvedDate || null,
  );

  return {
    totalSolved: stats?.totalSolved || 0,
    easySolved: stats?.easySolved || 0,
    mediumSolved: stats?.mediumSolved || 0,
    hardSolved: stats?.hardSolved || 0,
    totalSubmissions: stats?.totalSubmissions || 0,
    currentStreak,
    longestStreak: stats?.longestStreak || 0,
  };
};
