import { jest, test, expect, describe, afterEach } from "@jest/globals";

jest.unstable_mockModule("../../config/prisma.js", () => ({
  prisma: {
    question: {
      findUnique: jest.fn(),
    },
  },
}));

const { findByQuestionId } =
  await import("../../modules/questions/questions.repository.js");
const { prisma } = await import("../../config/prisma.js");

describe("findByQuestionId", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test("should return transformed question when question exists", async () => {
    const mockFindUnique = prisma.question
      .findUnique as unknown as jest.MockedFunction<any>;

    mockFindUnique.mockResolvedValue({
      id: "question-pk-1",
      questionId: "Q001",
      title: "Sum Two Numbers",
      testCases: [
        {
          id: "tc-1",
          questionPk: "question-pk-1",
          sortOrder: 1,
          input: "1 2",
          expectedOutput: "3",
        },
      ],
    });

    const result = await findByQuestionId("Q001");

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { questionId: "Q001" },
      include: {
        testCases: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    expect(result).toEqual({
      id: "question-pk-1",
      questionId: "Q001",
      title: "Sum Two Numbers",
      testCases: [
        {
          id: "tc-1",
          questionPk: "question-pk-1",
          sortOrder: 1,
          input: "1 2",
          output: "3",
        },
      ],
    });
  });

  test("should return null when question does not exist", async () => {
    const mockFindUnique = prisma.question
      .findUnique as unknown as jest.MockedFunction<any>;

    mockFindUnique.mockResolvedValue(null);

    const result = await findByQuestionId("INVALID");

    expect(result).toBeNull();
  });
});
