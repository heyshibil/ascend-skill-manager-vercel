import { Router } from "express";
import {
  addTrendingSkill,
  streamMarketUpdates,
  updateTrendingSkill,
  deleteTrendingSkill,
} from "./market.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../../middlewares/admin.middleware.js";

const router = Router();

router.get("/stream", streamMarketUpdates);
router.post("/trending", authenticate, isAdmin, addTrendingSkill);
router.put("/trending/:id", authenticate, isAdmin, updateTrendingSkill);
router.delete("/trending/:id", authenticate, isAdmin, deleteTrendingSkill);

export default router;
