import { TestHistory } from "../../models/TestHistory.js";
import { AppError } from "../../middlewares/error.middleware.js";
import { redisConnection } from "../../config/redis.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Skill } from "../../models/Skill.js";
import { User } from "../../models/User.js";
import { refreshLiquidityScore } from "../users/user.service.js";
import { executeCodeTest, runCodeTest } from "./compiler.service.js";
import {
  getFallbackSkill,
  resolveRuntime,
} from "../../utils/runtimeResolver.js";
import { invalidateCache } from "../../utils/cache.js";
import {
  findByQuestionId,
  findManyByQuestionIds,
  findManyQuestionsForGrading,
  findRandomQuestions,
  findVerifiedCodeQuestion,
} from "../questions/questions.repository.js";

// -- Generate the Test and create active section --
export const generateTest = async (
  userId: string,
  skillName: string,
  expectedLevel: string,
) => {
  // Check existing session(test)
  const existingSession = await redisConnection.get(`test_session:${userId}`);

  if (existingSession) {
    const activeTest = JSON.parse(existingSession);

    // Reload exact same questions assigned
    const mcqs = await findManyByQuestionIds(activeTest.mcqIds);

    const codeTest = await findByQuestionId(activeTest.codeId);

    return { mcqs, codeTest };
  }

  // Find questions seen in the last 4 weeks
  const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000);

  const recentHistories = await TestHistory.find({
    userId,
    skillName,
    createdAt: { $gte: fourWeeksAgo },
  });

  // Seen Ids
  const seenIds = recentHistories.flatMap((history) => history.questionIds);

  const level = expectedLevel.toLowerCase() as
    | "beginner"
    | "intermediate"
    | "advanced";

  // Fetch 5 random MCQs (postgres)
  const mcqs = await findRandomQuestions({
    skill: skillName,
    type: "mcq",
    level,
    excludeQuestionIds: seenIds,
    count: 5,
  });

  // Out of mcqs
  if (mcqs.length < 5) {
    throw new AppError("Not enough unique MCQ questions available.", 400);
  }

  // Find 1 random compiler question (postgres)
  const codeDbs = await findRandomQuestions({
    skill: skillName,
    type: "code",
    level,
    excludeQuestionIds: seenIds,
    count: 1,
  });

  // Out of codeDbs
  if (codeDbs.length < 1) {
    throw new AppError("Not enough unique code questions available.", 400);
  }

  const questionId = codeDbs[0]?.questionId;
  if (!questionId) return null;

  const codeTest = await findByQuestionId(questionId);

  // -- Redis test caching --
  const sessionData = {
    skillName,
    level,
    mcqIds: mcqs.map((q) => q.questionId),
    codeId: codeTest?.questionId,
    startTime: Date.now(),
  };

  await redisConnection.set(
    `test_session:${userId}`,
    JSON.stringify(sessionData),
    "EX",
    600,
  );

  return { mcqs, codeTest };
};

// -- Gemini Audit --
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const auditCodeWithGemini = async (
  userCode: string,
  problemStatement: string,
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }, // Force JSON return!
  });

  // Gemini prompt
  const prompt = `
    You are a Senior Software Engineer doing a strict code review.
    Problem: ${problemStatement}
    User Code:
    ${userCode}
    
    Task: Evaluate ONLY the code quality, time/space complexity, and modern standard practices.
    Return a strict JSON object with EXACTLY this structure:
    {
      "aiScore": number, // an integer from 0 to 10
      "feedback": string // 1-2 sentences of actionable advice
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      aiScore: typeof parsed.aiScore === "number" ? parsed.aiScore : 5,
      feedback: parsed.feedback || "Good attempt.",
    };
  } catch (error) {
    console.error("Gemini AI failed", error);
    return {
      aiScore: 5,
      feedback: "AI Audit unavailable, default score given.",
    };
  }
};

// -- Submit and Validate test --
export const gradeVerificationTest = async (
  userId: string,
  skillName: string,
  mcqAnswers: { questionId: string; answerIndex: number }[],
  codeAnswer: string,
  codeQuestionId: string,
) => {
  // Retrieve back the redis cached questions
  const sessionString = await redisConnection.get(`test_session:${userId}`);

  if (!sessionString) {
    throw new AppError(
      "Test session expired! You took longer than 20 minutes.",
      400,
    );
  }

  const activeSession = JSON.parse(sessionString);

  // Ban the test - manipulated question
  if (activeSession.codeId !== codeQuestionId) {
    await redisConnection.del(`test_session:${userId}`);
    throw new AppError(
      "Invalid test submission detected. Session invalidated.",
      403,
    );
  }

  for (const mcq of mcqAnswers) {
    if (!activeSession.mcqIds.includes(mcq.questionId)) {
      await redisConnection.del(`test_session:${userId}`);
      throw new AppError(
        "Invalid MCQ submission detected. Session invalidated.",
        403,
      );
    }
  }

  // Grade MCQs (40)
  // Batch fetch from postgres - no N+1 loop (mongoDB)

  const mcqIds = mcqAnswers.map((a) => a.questionId);

  const dbMcqQuestions = await findManyQuestionsForGrading(mcqIds);

  const mcqMap = new Map(dbMcqQuestions.map((q) => [q.questionId, q]));

  let correctMcqs = 0;
  const mcqResults: any = [];

  for (const answerSet of mcqAnswers) {
    const dbQuestion = mcqMap.get(answerSet.questionId);

    if (dbQuestion) {
      const isCorrect = dbQuestion.correctAnswerIndex === answerSet.answerIndex;

      if (isCorrect) correctMcqs++;

      mcqResults.push({
        questionId: dbQuestion.questionId,
        question: dbQuestion.question,
        options: dbQuestion.options,
        userAnswerIndex: answerSet.answerIndex,
        correctAnswerIndex: dbQuestion.correctAnswerIndex,
        isCorrect,
      });
    }
  }

  const mcqScore = (correctMcqs / 5) * 40;

  // Grade code (50)
  const dbCodeQ = await findVerifiedCodeQuestion(codeQuestionId);

  if (!dbCodeQ) {
    throw new AppError("Code question not found or not verified.", 404);
  }

  const runtime = resolveRuntime(skillName);

  const { compilerScore } = await executeCodeTest(
    codeAnswer,
    dbCodeQ.testCases.map((tc) => ({
      input: tc.input,
      output: tc.expectedOutput,
    })),
    dbCodeQ.validationScript ?? "",
    runtime,
  );

  // Gemini Audit (10)
  const { aiScore, feedback } = await auditCodeWithGemini(
    codeAnswer,
    dbCodeQ.question!,
  );

  // Final calculation (MCQ + Code + AI audit)
  const totalScore = mcqScore + compilerScore + aiScore;
  const finalScore = Math.min(100, Math.max(0, totalScore));

  // Update the Skill baseline score
  const skillRecord = await Skill.findOne({ userId, name: skillName });

  if (skillRecord) {
    skillRecord.baselineScore = Math.floor(finalScore);
    skillRecord.currentScore = Math.floor(finalScore);
    skillRecord.lastVerifiedDate = new Date();
    await skillRecord.save();
  }

  // refresh user liquidity score
  await refreshLiquidityScore(userId);

  // Log the Test History to prevent repetition (4w)
  const allQuestionIds = mcqAnswers
    .map((m) => m.questionId)
    .concat(codeQuestionId);

  await TestHistory.create({
    userId,
    skillName,
    questionIds: allQuestionIds,
  });

  // update user onboarding status
  await User.findByIdAndUpdate(userId, { onboardingStatus: "completed" });

  // Invalidate cache
  await invalidateCache(
    `dashboard:${userId}`,
    `leaderboard:score:page1:uid:${userId}`,
  );

  // delete session after test
  await redisConnection.del(`test_session:${userId}`);

  return {
    breakdown: {
      mcqPoints: mcqScore,
      compilerPoints: compilerScore,
      aiPoints: aiScore,
    },
    finalScore: Math.floor(finalScore),
    feedback,
    mcqResults,
  };
};

// -- Generate Boost test --
export const generateBoostTest = async (
  userId: string,
  skillName: string,
  type: "mcq" | "compiler",
  level?: string,
) => {
  const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000);

  const recentHistories = await TestHistory.find({
    userId,
    skillName,
    createdAt: { $gte: fourWeeksAgo },
  });
  const seenIds = recentHistories.flatMap((history) => history.questionIds);

  // Fetch user's current score for this skill
  const skillRecord = await Skill.findOne({ userId, name: skillName }).lean();
  const currentScore = skillRecord?.currentScore || 0;

  // Determine Confidence Level
  let targetLevel = "beginner";
  if (currentScore > 70) {
    targetLevel = "advanced";
  } else if (currentScore > 35) {
    targetLevel = "intermediate";
  }

  let mcqs = null;
  let codeTest = null;
  let mcqIds: string[] = [];
  let codeId = null;

  if (type === "mcq") {
    const rawMcqs = await findRandomQuestions({
      skill: skillName,
      type: "mcq",
      level: targetLevel as "beginner" | "intermediate" | "advanced",
      excludeQuestionIds: seenIds,
      count: 5,
    });

    if (rawMcqs.length < 5) {
      throw new AppError("Not enough unique MCQ questions available.", 400);
    }

    mcqs = rawMcqs;
    mcqIds = mcqs.map((q) => q.questionId);
  } else if (type === "compiler") {
    if (!level) {
      throw new AppError("Level is required for compiler test.", 400);
    }

    const safeLevel = level as "beginner" | "intermediate" | "advanced";

    let codeDbs = await findRandomQuestions({
      skill: skillName,
      type: "code",
      level: safeLevel,
      excludeQuestionIds: seenIds,
      count: 1,
    });

    if (codeDbs.length < 1) {
      const fallbackSkill = getFallbackSkill(skillName);

      codeDbs = await findRandomQuestions({
        skill: fallbackSkill!,
        type: "code",
        level: safeLevel,
        excludeQuestionIds: seenIds,
        count: 1,
      });
    }

    if (codeDbs.length < 1) {
      throw new AppError(
        "Not enough unique code questions available for this level.",
        400,
      );
    }

    // find question from postgreSQL
    const questionId = codeDbs[0]?.questionId;
    if (!questionId) return null;

    const fullCodeQuestion = await findByQuestionId(questionId);
    if (!fullCodeQuestion) {
      throw new AppError("Failed to fetch full question details.", 500);
    }

    codeTest = fullCodeQuestion;
    codeId = codeTest?.questionId;
  }

  // Cache specific boost session
  const sessionData = {
    skillName,
    type,
    mcqIds,
    codeId,
    level,
    startTime: Date.now(),
  };

  await redisConnection.set(
    `boost_session:${userId}`,
    JSON.stringify(sessionData),
    "EX",
    1200,
  );

  return { mcqs, codeTest };
};

// -- Grade MCQ boost test --
export const gradeMcqBoost = async (
  userId: string,
  skillName: string,
  mcqAnswers: { questionId: string; answerIndex: number }[],
) => {
  const sessionString = await redisConnection.get(`boost_session:${userId}`);

  if (!sessionString) {
    throw new AppError("Boost session expired! Too much time taken.", 400);
  }

  const activeSession = JSON.parse(sessionString);

  if (activeSession.type !== "mcq" || activeSession.skillName !== skillName) {
    await redisConnection.del(`boost_session:${userId}`);
    throw new AppError("Invalid session data. Session invalidated.", 403);
  }

  // Batch fetch from postgres - No N+1 loop complexity
  const mcqQuestionIds = mcqAnswers.map((a) => a.questionId);

  const dbMcqQuestions = await findManyQuestionsForGrading(mcqQuestionIds);

  const mcqMap = new Map(dbMcqQuestions.map((q) => [q.questionId, q]));

  let correctMcqs = 0;

  for (const answerSet of mcqAnswers) {
    if (!activeSession.mcqIds.includes(answerSet.questionId)) {
      throw new AppError("Invalid MCQ ID", 403);
    }

    const dbQuestion = mcqMap.get(answerSet.questionId);

    if (dbQuestion && dbQuestion.correctAnswerIndex === answerSet.answerIndex) {
      correctMcqs++;
    }
  }

  // 1% hike per right answer
  const hike = correctMcqs * 1;

  const skillRecord = await Skill.findOne({ userId, name: skillName });
  if (skillRecord) {
    skillRecord.currentScore = Math.min(100, skillRecord.currentScore + hike);
    await skillRecord.save();
  }

  await refreshLiquidityScore(userId);
  await TestHistory.create({
    userId,
    skillName,
    questionIds: activeSession.mcqIds,
  });

  await invalidateCache(
    `dashboard:${userId}`,
    `leaderboard:score:page1:uid:${userId}`,
  );
  await redisConnection.del(`boost_session:${userId}`);

  return {
    correctCount: correctMcqs,
    hikeApplied: hike,
    newScore: skillRecord?.currentScore,
  };
};

// -- Grade Compiler boost test --
export const gradeCompilerBoost = async (
  userId: string,
  skillName: string,
  codeAnswer: string,
  codeQuestionId: string,
) => {
  const sessionString = await redisConnection.get(`boost_session:${userId}`);
  if (!sessionString) {
    throw new AppError("Boost session expired!", 400);
  }

  const activeSession = JSON.parse(sessionString);

  if (
    activeSession.type !== "compiler" ||
    activeSession.codeId !== codeQuestionId ||
    activeSession.skillName !== skillName
  ) {
    await redisConnection.del(`boost_session:${userId}`);
    throw new AppError("Invalid session data. Session invalidated.", 403);
  }

  const dbCodeQ = await findVerifiedCodeQuestion(codeQuestionId);

  if (!dbCodeQ) {
    throw new AppError("Question not found", 404);
  }

  const runtime = resolveRuntime(skillName);

  const { passedCases, totalCases } = await executeCodeTest(
    codeAnswer,
    dbCodeQ.testCases.map((tc) => ({
      input: tc.input,
      output: tc.expectedOutput,
    })),
    dbCodeQ.validationScript ?? "",
    runtime,
  );

  let hike = 0;

  if (passedCases === totalCases && totalCases > 0) {
    if (activeSession.level === "beginner") hike = 10;
    else if (activeSession.level === "intermediate") hike = 25;
    else if (activeSession.level === "advanced") hike = 50;
  }

  const skillRecord = await Skill.findOne({ userId, name: skillName });
  if (skillRecord) {
    skillRecord.currentScore = Math.min(100, skillRecord.currentScore + hike);
    await skillRecord.save();
  }

  await refreshLiquidityScore(userId);

  await TestHistory.create({
    userId,
    skillName,
    questionIds: [codeQuestionId],
  });

  await redisConnection.del(`boost_session:${userId}`);

  await invalidateCache(
    `dashboard:${userId}`,
    `leaderboard:score:page1:uid:${userId}`,
  );

  return {
    passedCases,
    totalCases,
    hikeApplied: hike,
    newScore: skillRecord?.currentScore,
  };
};

// Dry test run
export const runCode = async (
  userId: string,
  code: string,
  questionId: string,
) => {
  // Verify user has an active session (boost or test)
  const boostSession = await redisConnection.get(`boost_session:${userId}`);
  const testSession = await redisConnection.get(`test_session:${userId}`);

  if (!boostSession && !testSession) {
    throw new AppError("No active test session found.", 400);
  }

  const dbQuestion = await findByQuestionId(questionId);

  if (!dbQuestion || !dbQuestion.testCases) {
    throw new AppError("Question not found or has no test cases.", 404);
  }

  const runtime = resolveRuntime(dbQuestion.skill);
  const result = await runCodeTest(code, dbQuestion.testCases, runtime);

  return result;
};
