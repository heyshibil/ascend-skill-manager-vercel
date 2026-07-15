import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { test, expect, describe, afterAll } from "@jest/globals";
const { prisma } = await import("../../../config/prisma.js");
const { insertQuestion, findByQuestionId } =
  await import("../questions.repository.js");

describe("questions.repository", () => {
  const testQuestionId = "test-q-001";

  // Clean up after all tests in this file run
  afterAll(async () => {
    await prisma.question.deleteMany({ where: { questionId: testQuestionId } });
    await prisma.$disconnect();
  });

  test("should create a question and fetch it by questionId", async () => {
    // 1. Insert a real row into the test database
    await insertQuestion({
      questionId: testQuestionId,
      skill: "javascript",
      level: "beginner",
      topic: "Closures",
      type: "mcq",
      question: "What is a closure?",
      options: ["A function", "A variable", "A loop", "An object"],
      correctAnswerIndex: 0,
    });

    // 2. Fetch it back using the real function we're testing
    const result = await findByQuestionId(testQuestionId);

    // 3. Assert it matches what we inserted
    expect(result).not.toBeNull();
    expect(result?.questionId).toBe(testQuestionId);
    expect(result?.topic).toBe("Closures");
    expect(result?.type).toBe("mcq");
  });

  test("should return null when questionId does not exist", async () => {
    const result = await findByQuestionId("fake-question-id");
    expect(result).toBeNull();
  });
});
