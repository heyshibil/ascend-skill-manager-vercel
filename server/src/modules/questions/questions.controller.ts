import type { Request, Response, NextFunction } from "express";
import { generateQuestionId } from "./questions.service.js";
import { Question } from "../../models/Question.js";
import {
  bulkQuestionsSchema,
  updateQuestionSchema,
  visibilitySchema,
} from "./questions.validation.js";
import { AppError } from "../../middlewares/error.middleware.js";


export const seedBulkQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedQuestions = bulkQuestionsSchema.parse(req.body.questions);

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as { index: number; error: string }[],
    };

    for (let i = 0; i < validatedQuestions.length; i++) {
      const payload: any = validatedQuestions[i];

      try {
        payload.questionId = await generateQuestionId(
          payload.type,
          payload.skill,
          payload.level,
        );

        const newQuestion = new Question(payload);
        await newQuestion.save();

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          error: error.message || "Failed to save to database",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Seeded ${results.successful} items. Failed ${results.failed}.`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    payload.questionId = await generateQuestionId(
      payload.type,
      payload.skill,
      payload.level,
    );

    const newQuestion = new Question(payload);
    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: "Question seeded successfully",
      question: newQuestion,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page = 1, limit = 20, skill, level, type, search, showHidden } =
      req.query;

    const filter: Record<string, any> = {};

    if (showHidden === "true") {
      filter.isHidden = true;          // ONLY hidden questions
    } else {
      filter.isHidden = { $ne: true }; // ONLY visible questions
    }
    if (skill) filter.skill = skill;
    if (level) filter.level = level;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { questionId: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQuestionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) throw new AppError("Question not found", 404);

    res.status(200).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const existing = await Question.findById(req.params.id);
    if (!existing) throw new AppError("Question not found", 404);

    // Validate with the question's own type injected so discriminated union works
    const validated = updateQuestionSchema.parse({
      type: existing.type,
      ...req.body,
    });

    // Strip `type` — it is immutable (encoded in questionId)
    const { type: _type, ...updateFields } = validated;

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleVisibility = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { isHidden } = visibilitySchema.parse(req.body);

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: { isHidden } },
      { new: true },
    );
    if (!updated) throw new AppError("Question not found", 404);

    const action = isHidden ? "hidden from users" : "visible to users";

    res.status(200).json({
      success: true,
      message: `Question is now ${action}`,
      data: { isHidden: updated.isHidden },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) throw new AppError("Question not found", 404);

    res.status(200).json({
      success: true,
      message: "Question permanently deleted",
    });
  } catch (error) {
    next(error);
  }
};
