import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../../middlewares/admin.middleware.js";
import {
  createQuestion,
  seedBulkQuestions,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  toggleVisibility,
  deleteQuestion,
  adminRunCode,
  toggleVerified,
} from "./questions.controller.js";

const router = Router();

router.post("/", authenticate, isAdmin, createQuestion);
router.post("/bulk", authenticate, isAdmin, seedBulkQuestions);
router.get("/", authenticate, isAdmin, getAllQuestions);
router.get("/:id", authenticate, isAdmin, getQuestionById);
router.patch("/:id", authenticate, isAdmin, updateQuestion);
router.patch("/:id/visibility", authenticate, isAdmin, toggleVisibility);
router.patch("/:id/verified", authenticate, isAdmin, toggleVerified);
router.delete("/:id", authenticate, isAdmin, deleteQuestion);

// Admin run-code: no rate limiter — auth + isAdmin only
router.post("/:id/run", authenticate, isAdmin, adminRunCode);

export default router;

