import { z } from "zod";

const baseQuestionSchema = z.object({
  skill: z.string({ error: "Skill is required" }),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  topic: z.string({ error: "Topic is required" }),
  type: z.enum(["mcq", "code"]),
  question: z.string({ error: "Question text is required" }),
});

const mcqSchema = baseQuestionSchema.extend({
  type: z.literal("mcq"),
  options: z.array(z.string()).length(4, "MCQ must have exactly 4 options"),
  correctAnswerIndex: z.number().min(0).max(3),
});

const codeSchema = baseQuestionSchema.extend({
  type: z.literal("code"),
  starterCode: z.string(),
  validationScript: z.string(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
      }),
    )
    .min(1, "Code question requires at least 1 test case"),
});

export const bulkQuestionsSchema = z.array(
  z.discriminatedUnion("type", [mcqSchema, codeSchema]),
);

// Update validation
export const updateQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    skill: z.string().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    topic: z.string().optional(),
    question: z.string().optional(),
    options: z.array(z.string()).length(4).optional(),
    correctAnswerIndex: z.number().min(0).max(3).optional(),
  }),
  z.object({
    type: z.literal("code"),
    skill: z.string().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    topic: z.string().optional(),
    question: z.string().optional(),
    starterCode: z.string().optional(),
    validationScript: z.string().optional(),
    testCases: z
      .array(z.object({ input: z.string(), output: z.string() }))
      .min(1)
      .optional(),
  }),
]);

// hide/show validation
export const visibilitySchema = z.object({
  isHidden: z.boolean(),
});
