import express from "express";
import {
  getMySettings,
  updateMySettings,
  updateAISettings,
  updateNotificationSettings,
  updateProfileSettings,
} from "../controllers/settingsController.js";

const router = express.Router();

router.get("/me", getMySettings);
router.put("/me", updateMySettings);
router.patch("/ai", updateAISettings);
router.patch("/notifications", updateNotificationSettings);
router.patch("/profile", updateProfileSettings);

export default router;
