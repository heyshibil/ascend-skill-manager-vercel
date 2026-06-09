import type { Request, Response, NextFunction } from "express";
import * as problemsService from "./problems.service.js";
import { AppError } from "../../middlewares/error.middleware.js";

export const listProblems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skill, level, search } = req.query;
    const queryParams: {
      page?: number;
      limit?: number;
      skill?: string;
      level?: string;
      search?: string;
    } = {
      skill: skill as string,
      level: level as string,
      search: search as string,
    };
    if (page) queryParams.page = Number(page);
    if (limit) queryParams.limit = Number(limit);

    const result = await problemsService.listProblems(req.userId!, queryParams);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getProblem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    const result = await problemsService.getProblem(
      questionId as string,
      req.userId!,
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const runProblem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    const { code } = req.body;

    if (!code) throw new AppError("Code is required", 400);

    const result = await problemsService.runProblem(
      req.userId!,
      questionId as string,
      code as string,
    );

    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

export const submitProblem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    const { code } = req.body;
    if (!code) throw new AppError("Code is required", 400);
    const result = await problemsService.submitProblem(
      req.userId!,
      questionId as string,
      code as string,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stats = await problemsService.getUserStats(req.userId!);
    res.status(200).json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};
