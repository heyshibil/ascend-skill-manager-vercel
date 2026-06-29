import type { Types } from "mongoose";

// Define common fields once
interface IBaseEntity {
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSettings {
  decayNotifications: boolean;
  weeklyReport: boolean;
}

export interface ILiquidityHistory {
  score: number;
  date: Date;
}

// User
export interface IUser extends IBaseEntity {
  role: "user" | "admin";
  authProvider: "github" | "manual";
  githubId?: string | undefined;
  password?: string | undefined; //manual users
  isEmailVerified: boolean;
  emailVerificationToken?: string | undefined;
  emailVerificationExpires?: Date | undefined;
  pendingEmail?: string | undefined;
  emailChangeToken?: string | undefined;
  emailChangeExpires?: Date | undefined;
  pendingPassword?: string | undefined;
  passwordChangeToken?: string | undefined;
  passwordChangeExpires?: Date | undefined;

  // Profile
  username: string;
  email: string;
  avatarUrl?: string | undefined; //from github
  careerGoal: string;
  coreLanguage?: string | undefined;
  onboardingStatus:
    | "pending_scan"
    | "pending_discovery"
    | "pending_test"
    | "completed";
  status: "active" | "blocked";
  lastSeen: Date;

  // Score
  liquidityScore: {
    current: number;
    history: ILiquidityHistory[];
  };

  // Preferences
  settings: IUserSettings;
  lastProcessedAt?: Date;
}

// Skill
export interface ISkill extends IBaseEntity {
  userId: Types.ObjectId;
  name: string;
  category: "Foundational" | "Framework" | "Tooling" | "Language";
  baselineScore: number; // Po
  currentScore: number; // live charge
  lastVerifiedDate: Date; // t starts here
  verificationMethod: "github" | "manual" | "linkedin";
  stabilityConstant: number; // Stability Constant
  masteryMultiplier: number; // Bonus for experiance
  dependsOn?: Types.ObjectId[]; // Dependency graph
}

// Admin-managed skill preset
export interface ISkillDefinition extends IBaseEntity {
  name: string;
  normalizedName: string;
  category: "Foundational" | "Framework" | "Tooling" | "Language";
  stabilityConstant: number;
  dependsOn?: Types.ObjectId[];
  isActive: boolean;
}

// Question
export interface ITestCase {
  input: string;
  output: string;
}

export interface IQuestion extends IBaseEntity {
  questionId: string;
  skill: string;
  level: "beginner" | "intermediate" | "advanced";
  topic: string;
  type: "mcq" | "code";
  question?: string;

  // MCQ Fields
  options?: string[];
  correctAnswerIndex?: number;

  // Code Fields
  starterCode?: string;
  validationScript?: string;
  testCases?: ITestCase[];
  isHidden?: Boolean;
  isVerified?: Boolean;
}

// TestHistory
export interface ITestHistory extends IBaseEntity {
  userId: Types.ObjectId;
  skillName: string;
  questionIds: string[];
}

// Lambda types
export interface TestCase {
  input: string;
  output: string;
}

export interface LambdaResponse {
  statusCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface CompilerResult {
  compilerScore: number;
  passedCases: number;
  totalCases: number;
}

export interface ITrendingSkillHistory {
  date: Date;
  demandPercentage: number;
  openRoles: number;
}

// Hot skills
export interface ITrendingSkill extends IBaseEntity {
  skillName: string;
  demandPercentage: number;
  parentLanguage?: string;
  openRoles: number;
  history: ITrendingSkillHistory[];
}

// Decay engine
export interface DecayTickResult {
  usersProcessed: number;
  skillsDecayed: number;
  skillsEnteredDebt: number;
  errors: number;
}

// Run code test --
export interface RunCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}
export interface RunCodeResult {
  passedCases: number;
  totalCases: number;
  results: RunCaseResult[];
  timedOut: boolean;
}

// Problem Solving --
export interface ISubmission extends IBaseEntity {
  userId: Types.ObjectId;
  questionId: string;
  code: string;
  runtime: string;
  status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit";
  passedCases: number;
  totalCases: number;
  executionTimeMs?: number;
}

export interface IUserProblemStats extends IBaseEntity {
  userId: Types.ObjectId;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  currentStreak: number;
  longestStreak: number;
  lastSolvedDate?: Date;
  solvedQuestionIds: string[];
}

// Admin chart 
export type ChartPeriod = 'days' | 'week' | 'month';