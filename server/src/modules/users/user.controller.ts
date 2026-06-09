import type { Request, Response, NextFunction } from "express";
import * as userService from "./user.service.js";
import {
  requestEmailChangeSchema,
  requestPasswordChangeSchema,
  updateProfileSchema,
} from "./user.validation.js";
import type { ChartPeriod } from "../../types/index.js";

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error("userId is missing in req");

    const data = await userService.getDashboardData(userId);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error("userId is missing in req");

    const validatedData = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(userId, validatedData);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const requestEmailChange = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error("userId is missing in req");

    const validatedData = requestEmailChangeSchema.parse(req.body);
    const result = await userService.requestEmailChange(userId, validatedData);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string") {
      res.status(400).json({ success: false, message: "Invalid token" });
      return;
    }

    const user = await userService.verifyEmailChange(token);

    res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordChange = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error("userId is missing in req");

    const validatedData = requestPasswordChangeSchema.parse(req.body);
    const result = await userService.requestPasswordChange(
      userId,
      validatedData,
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordChange = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string") {
      res.status(400).json({ success: false, message: "Invalid token" });
      return;
    }

    const result = await userService.verifyPasswordChange(token);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const data = await userService.fetchAllUsers(
      search as string | undefined,
      Number(page),
      Number(limit),
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await userService.modifyUserStatus(userId as string, status);

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await userService.getAdminDashboardData();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdminChartData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const period = (req.query.period as ChartPeriod) || "days";
    const data = await userService.getAdminChartData(period);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
