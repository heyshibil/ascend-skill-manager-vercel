import argon2 from "argon2";
import crypto from "crypto";
import { Skill } from "../../models/Skill.js";
import { User } from "../../models/User.js";
import { sendEmail } from "../../config/email.js";
import { AppError } from "../../middlewares/error.middleware.js";
import { determineSkillStatus } from "../../utils/skillConstants.js";
import type {
  RequestEmailChangeInput,
  RequestPasswordChangeInput,
  UpdateProfileInput,
} from "./user.validation.js";
import { UserProblemStats } from "../../models/UserProblemStats.js";
import { SkillDefinition } from "../../models/SkillDefinition.js";
import type { ChartPeriod } from "../../types/index.js";
import { getEffectiveStreak } from "../problems/problems.service.js";
import { withCache } from "../../utils/cache.js";
import { countQuestionsByType } from "../questions/questions.repository.js";

const SETTINGS_TOKEN_TTL_MS = 30 * 60 * 1000;

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hashedToken: hashToken(token),
    expiresAt: new Date(Date.now() + SETTINGS_TOKEN_TTL_MS),
  };
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const serializeUser = (user: any) => {
  const serialized = user.toObject ? user.toObject() : { ...user };

  delete serialized.password;
  delete serialized.emailVerificationToken;
  delete serialized.emailVerificationExpires;
  delete serialized.pendingEmail;
  delete serialized.emailChangeToken;
  delete serialized.emailChangeExpires;
  delete serialized.pendingPassword;
  delete serialized.passwordChangeToken;
  delete serialized.passwordChangeExpires;

  return serialized;
};

const assertUsernameAvailable = async (
  username: string,
  userId: string,
): Promise<void> => {
  const existingUser = await User.findOne({
    _id: { $ne: userId },
    username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  })
    .select("_id")
    .lean();

  if (existingUser) {
    throw new AppError("This username is already taken", 409);
  }
};

const assertEmailAvailable = async (
  email: string,
  userId?: string,
): Promise<void> => {
  const query =
    userId === undefined ? { email } : { _id: { $ne: userId }, email };

  const existingUser = await User.findOne(query).select("_id").lean();

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409);
  }
};

const computeLiquidityScore = (skills: { currentScore: number }[]): number => {
  if (skills.length === 0) return 0;
  const total = skills.reduce((acc, s) => acc + (s.currentScore || 0), 0);
  return Math.round(total / skills.length);
};

const fetchDashboardFromDB = async (userId: string) => {
  const currentScore = await refreshLiquidityScore(userId);

  const user = await User.findById(userId).select("liquidityScore");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Skill debts
  const skills = await Skill.find({ userId });

  let debtCount = 0;
  let drainingSkills = 0;

  skills.forEach((skill) => {
    const status = determineSkillStatus(skill.currentScore);
    if (status === "debt") debtCount++;
    if (status === "draining") drainingSkills++;
  });

  // Top skills
  const topSkills = [...skills]
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 5)
    .map((s) => ({ name: s.name, score: Math.round(s.currentScore) }));

  // User problems stats
  const problemStats = await UserProblemStats.findOne({ userId }).lean();
  const currentStreak = getEffectiveStreak(
    problemStats?.currentStreak || 0,
    problemStats?.lastSolvedDate || null,
  );

  return {
    score: currentScore,
    scoreHistory: user.liquidityScore.history,
    activeSkills: skills.length,
    skillDebts: {
      total: debtCount + drainingSkills,
      critical: debtCount,
      drainingSkills,
    },
    topSkills,
    problemStats: {
      totalSolved: problemStats?.totalSolved || 0,
      currentStreak,
    },
  };
};

export const refreshLiquidityScore = async (
  userId: string,
): Promise<number> => {
  const skills = await Skill.find({ userId }).select("currentScore");
  const newScore = computeLiquidityScore(skills);

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.liquidityScore) {
    user.liquidityScore = { current: 0, history: [] };
  }

  const history = user.liquidityScore.history;
  const lastEntry = history[history.length - 1];
  const todayStr = new Date().toDateString();

  // track liquidityScore change
  let isChanged = false;

  if (user.liquidityScore.current !== newScore) {
    user.liquidityScore.current = newScore;
    isChanged = true;
  }

  if (!lastEntry || lastEntry.score !== newScore) {
    const lastEntryIsToday =
      lastEntry && new Date(lastEntry.date).toDateString() === todayStr;

    // Same day - update final score, no push
    if (lastEntryIsToday) {
      lastEntry.score = newScore;
      lastEntry.date = new Date();
    }
    // Diff day - push new score
    else {
      history.push({ score: newScore, date: new Date() });

      // Cap the history array
      if (history.length > 100) {
        history.shift();
      }
    }

    user.markModified("liquidityScore");
    isChanged = true;
  }

  if (isChanged) await user.save();
  return newScore;
};

//  getDashboard with redis caching
export const getDashboardData = async (userId: string) => {
  return withCache(`dashboard:${userId}`, () => fetchDashboardFromDB(userId), {
    ttl: 300,
    stale: 60,
  });
};

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const username = input.username.trim();
  await assertUsernameAvailable(username, userId);

  user.username = username;

  if (input.avatarUrl !== undefined) {
    const avatarUrl = input.avatarUrl.trim();
    user.avatarUrl = avatarUrl === "" ? undefined : avatarUrl;
  }

  await user.save();

  return serializeUser(user);
};

export const requestEmailChange = async (
  userId: string,
  input: RequestEmailChangeInput,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const email = input.email.trim().toLowerCase();

  if (email === user.email.toLowerCase()) {
    throw new AppError("This is already your account email", 400);
  }

  await assertEmailAvailable(email, userId);

  const { token, hashedToken, expiresAt } = createVerificationToken();

  user.pendingEmail = email;
  user.emailChangeToken = hashedToken;
  user.emailChangeExpires = expiresAt;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email-change/${token}`;

  await sendEmail({
    to: email,
    subject: "Confirm your Ascend email change",
    html: `
      <h2>Confirm your email change</h2>
      <p>Click the link below to make this the email for your Ascend account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 30 minutes.</p>
    `,
  });

  return {
    message: "Verification email sent to your new address.",
  };
};

export const verifyEmailChange = async (token: string) => {
  const user = await User.findOne({
    emailChangeToken: hashToken(token),
    emailChangeExpires: { $gt: new Date() },
  });

  if (!user || !user.pendingEmail) {
    throw new AppError("Invalid or expired email change link", 400);
  }

  await assertEmailAvailable(user.pendingEmail, user._id!.toString());

  user.email = user.pendingEmail;
  user.pendingEmail = undefined;
  user.emailChangeToken = undefined;
  user.emailChangeExpires = undefined;
  user.isEmailVerified = true;
  await user.save();

  return serializeUser(user);
};

export const requestPasswordChange = async (
  userId: string,
  input: RequestPasswordChangeInput,
) => {
  const user = await User.findById(userId).select("+password +pendingPassword");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.authProvider !== "manual" || !user.password) {
    throw new AppError(
      "Password changes are available for email/password accounts only",
      400,
    );
  }

  const isCurrentPasswordValid = await argon2.verify(
    user.password,
    input.currentPassword,
  );

  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const isSamePassword = await argon2.verify(user.password, input.newPassword);

  if (isSamePassword) {
    throw new AppError(
      "New password must be different from current password",
      400,
    );
  }

  const { token, hashedToken, expiresAt } = createVerificationToken();

  user.pendingPassword = await argon2.hash(input.newPassword);
  user.passwordChangeToken = hashedToken;
  user.passwordChangeExpires = expiresAt;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-password-change/${token}`;

  await sendEmail({
    to: user.email,
    subject: "Confirm your Ascend password change",
    html: `
      <h2>Confirm your password change</h2>
      <p>Click the link below to apply the new password to your Ascend account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 30 minutes.</p>
    `,
  });

  return {
    message: "Password verification email sent.",
  };
};

export const verifyPasswordChange = async (token: string) => {
  const user = await User.findOne({
    passwordChangeToken: hashToken(token),
    passwordChangeExpires: { $gt: new Date() },
  }).select("+pendingPassword");

  if (!user || !user.pendingPassword) {
    throw new AppError("Invalid or expired password change link", 400);
  }

  user.password = user.pendingPassword;
  user.pendingPassword = undefined;
  user.passwordChangeToken = undefined;
  user.passwordChangeExpires = undefined;
  await user.save();

  return {
    message: "Password updated successfully.",
  };
};

export const fetchAllUsers = async (
  search: string | undefined,
  page: number,
  limit: number,
) => {
  const query: any = {};

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};

export const modifyUserStatus = async (userId: string, status: string) => {
  if (!["active", "blocked"].includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { status },
    { returnDocument: "after", runValidators: true },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const getAdminDashboardData = async () => {
  const [totalUsers, totalSkills, totalQuestions] = await Promise.all([
    User.countDocuments(),
    SkillDefinition.countDocuments({ isActive: true }),
    countQuestionsByType("code"),
  ]);

  const recentUsers = await User.find()
    .select("username email careerGoal onboardingStatus createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    metrics: {
      totalUsers,
      totalSkills,
      totalQuestions,
    },
    recentUsers,
  };
};

export const getAdminChartData = async (period: ChartPeriod) => {
  const now = new Date();
  let startDate = new Date();
  let groupByFormat = "";

  if (period === "days") {
    startDate.setDate(now.getDate() - 30);
    groupByFormat = "%Y-%m-%d";
  } else if (period === "week") {
    startDate.setDate(now.getDate() - 90);
    groupByFormat = "%Y-%U";
  } else {
    startDate.setMonth(now.getMonth() - 12);
    groupByFormat = "%Y-%m";
  }

  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  let cumulativeCount = await User.countDocuments({
    createdAt: { $lt: startDate },
  });

  const formattedUserGrowth = userGrowth.map((item) => {
    cumulativeCount += item.count;
    return { date: item._id, count: cumulativeCount };
  });

  const liquidityData = await User.aggregate([
    { $unwind: "$liquidityScore.history" },
    { $match: { "liquidityScore.history.date": { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupByFormat,
            date: "$liquidityScore.history.date",
          },
        },
        avgScore: { $avg: "$liquidityScore.history.score" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const formattedLiquidity = liquidityData.map((item) => ({
    date: item._id,
    score: Math.round(item.avgScore),
  }));

  return {
    userGrowth: formattedUserGrowth,
    liquidity: formattedLiquidity,
  };
};
