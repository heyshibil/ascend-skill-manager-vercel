import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type NewQuestionInput = {
  questionId: string;
  skill: string;
  level: "beginner" | "intermediate" | "advanced";
  topic: string;
  type: "mcq" | "code";
  question?: string;
  options?: string[];
  correctAnswerIndex?: number;
  starterCode?: string;
  validationScript?: string;
  testCases?: { input: string; output: string }[];
  isHidden?: boolean;
  isVerified?: boolean;
};

type RandomQuestionRow = {
  id: number;
  questionId: string;
  question: string | null;
  options: string[];
  level: string;
};

type UpdateQuestionInput = {
  skill?: string | undefined;
  level?: ("beginner" | "intermediate" | "advanced") | undefined;
  topic?: string | undefined;
  question?: string | undefined;
  options?: string[] | undefined;
  correctAnswerIndex?: number | undefined;
  starterCode?: string | undefined;
  validationScript?: string | undefined;
  testCases?: { input: string; output: string }[] | undefined;
  isHidden?: boolean | undefined;
  isVerified?: boolean | undefined;
};

export const insertQuestion = async (data: NewQuestionInput) => {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        questionId: data.questionId,
        skill: data.skill,
        level: data.level,
        topic: data.topic,
        type: data.type,
        question: data.question ?? null,
        options: data.options ?? [],
        correctAnswerIndex: data.correctAnswerIndex ?? null,
        starterCode: data.starterCode ?? null,
        validationScript: data.validationScript ?? null,
        isHidden: data.isHidden ?? false,
        isVerified: data.isVerified ?? false,
      },
    });

    if (data.testCases && data.testCases.length > 0) {
      await tx.questionTestCase.createMany({
        data: data.testCases.map((tc, i) => ({
          questionPk: question.id,
          sortOrder: i,
          input: tc.input,
          expectedOutput: tc.output,
        })),
      });
    }

    return question;
  });
};

export const findByQuestionId = async (questionId: string) => {
  const question = await prisma.question.findUnique({
    where: { questionId },
    include: {
      testCases: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!question) return null;

  return {
    ...question,
    testCases: question.testCases.map((tc) => ({
      id: tc.id,
      questionPk: tc.questionPk,
      sortOrder: tc.sortOrder,
      input: tc.input,
      output: tc.expectedOutput,
    })),
  };
};

// Find random MCQ questions and code Question
export const findRandomQuestions = async (params: {
  skill: string;
  type: "mcq" | "code";
  level: "beginner" | "intermediate" | "advanced";
  excludeQuestionIds: string[];
  count: number;
}) => {
  const { skill, type, level, excludeQuestionIds, count } = params;

  const excludeList = excludeQuestionIds.length > 0 ? excludeQuestionIds : [""];

  // Only code questions need isVerified check
  const verifiedFilter =
    type === "code" ? Prisma.sql`AND "isVerified" = true` : Prisma.sql``;

  const rows = await prisma.$queryRaw<RandomQuestionRow[]>(Prisma.sql`
  SELECT id, "questionId", question, options, level
  FROM "Question"
  WHERE skill = ${skill}
    AND type = ${type}::"QuestionType"
    AND level = ${level}::"QuestionLevel"
    AND "isHidden" = false
    ${verifiedFilter}
    AND "questionId" NOT IN (${Prisma.join(excludeList)})
  ORDER BY RANDOM()
  LIMIT ${count}
`);

  return rows;
};

export const findManyByQuestionIds = async (questionIds: string[]) => {
  return prisma.question.findMany({
    where: {
      questionId: { in: questionIds },
    },
    select: {
      id: true,
      questionId: true,
      question: true,
      options: true,
      level: true,
    },
  });
};

export const listQuestions = async (params: {
  type: "mcq" | "code";
  skill?: string;
  level?: "beginner" | "intermediate" | "advanced";
  search?: string;
  skip: number;
  limit: number;
}) => {
  const { type, skill, level, search, skip, limit } = params;

  const where = {
    type,
    isVerified: true,
    isHidden: false,
    ...(skill ? { skill } : {}),
    ...(level ? { level } : {}),
    ...(search
      ? {
          OR: [
            { question: { contains: search, mode: "insensitive" as const } },
            { topic: { contains: search, mode: "insensitive" as const } },
            { skill: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [problems, total] = await Promise.all([
    prisma.question.findMany({
      where,
      select: {
        questionId: true,
        skill: true,
        level: true,
        topic: true,
        question: true,
      },
      orderBy: [{ skill: "asc" }, { level: "asc" }],
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return { problems, total };
};

export const updateQuestion = async (
  questionId: string,
  data: UpdateQuestionInput,
) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.question.findUnique({
      where: { questionId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const question = await tx.question.update({
      where: { questionId },
      data: {
        ...(data.skill !== undefined && { skill: data.skill }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.topic !== undefined && { topic: data.topic }),
        ...(data.question !== undefined && { question: data.question }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.correctAnswerIndex !== undefined && {
          correctAnswerIndex: data.correctAnswerIndex,
        }),
        ...(data.starterCode !== undefined && {
          starterCode: data.starterCode,
        }),
        ...(data.validationScript !== undefined && {
          validationScript: data.validationScript,
        }),
        ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
        ...(data.isVerified !== undefined && {
          isVerified: data.isVerified,
        }),
      },
    });

    // Replace test cases entirely if new ones were provided
    if (data.testCases) {
      await tx.questionTestCase.deleteMany({
        where: { questionPk: existing.id },
      });

      if (data.testCases.length > 0) {
        await tx.questionTestCase.createMany({
          data: data.testCases.map((tc, i) => ({
            questionPk: existing.id,
            sortOrder: i,
            input: tc.input,
            expectedOutput: tc.output,
          })),
        });
      }
    }

    return question;
  });
};

export const generateNextQuestionId = async (
  prefix: string,
): Promise<string> => {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ next_number: number }[]>(Prisma.sql`
      SELECT COALESCE(
        MAX(CAST(SPLIT_PART("questionId", '-', 4) AS INTEGER)), 0
      ) + 1 AS next_number
      FROM "Question"
      WHERE "questionId" LIKE ${prefix + "-%"}
    `);

    const nextNumber = rows[0]?.next_number ?? 1;
    const padded = String(nextNumber).padStart(3, "0");
    const newQuestionId = `${prefix}-${padded}`;
    return newQuestionId;
  });
};

// #Admin
export const listQuestionsAdmin = async (params: {
  page: number;
  limit: number;
  skill?: string;
  level?: "beginner" | "intermediate" | "advanced";
  type?: "mcq" | "code";
  search?: string;
  showHidden?: boolean;
  isVerified?: boolean;
  sort?: "old" | "verified" | "unverified" | "new";
}) => {
  const {
    page,
    limit,
    skill,
    level,
    type,
    search,
    showHidden,
    isVerified,
    sort,
  } = params;

  const where = {
    isHidden: showHidden ? true : false,
    ...(isVerified !== undefined ? { isVerified } : {}),
    ...(skill
      ? { skill: { equals: skill, mode: "insensitive" as const } }
      : {}),
    ...(level ? { level } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { question: { contains: search, mode: "insensitive" as const } },
            { skill: { contains: search, mode: "insensitive" as const } },
            { topic: { contains: search, mode: "insensitive" as const } },
            { questionId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "old"
      ? [{ createdAt: "asc" as const }]
      : sort === "verified"
        ? [{ isVerified: "desc" as const }, { createdAt: "desc" as const }]
        : sort === "unverified"
          ? [{ isVerified: "asc" as const }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { testCases: { orderBy: { sortOrder: "asc" } } },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  const mappedQuestions = questions.map((q) => ({
    ...q,
    testCases: q.testCases.map((tc) => ({
      id: tc.id,
      questionPk: tc.questionPk,
      sortOrder: tc.sortOrder,
      input: tc.input,
      output: tc.expectedOutput,
    })),
  }));

  return { questions: mappedQuestions, total };
};

export const deleteQuestionByQuestionId = async (questionId: string) => {
  return prisma.question.delete({ where: { questionId } }).catch(() => null);
};

export const findVerifiedCodeQuestion = async (questionId: string) => {
  return prisma.question.findFirst({
    where: {
      questionId,
      type: "code",
      isVerified: true,
      isHidden: false,
    },
    include: {
      testCases: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
};

export const findManyQuestionsForGrading = async (questionIds: string[]) => {
  return prisma.question.findMany({
    where: {
      questionId: { in: questionIds },
    },
    select: {
      questionId: true,
      question: true,
      options: true,
      correctAnswerIndex: true,
    },
  });
};

// Count question by types - admin dashboard
export const countQuestionsByType = async (type: "mcq" | "code") => {
  return prisma.question.count({ where: { type } });
};
