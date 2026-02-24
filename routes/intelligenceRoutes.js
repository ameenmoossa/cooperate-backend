import express from "express";
import { getIntelligence } from "../controllers/intelligenceController.js";

const router = express.Router();

/* ================= AI INTELLIGENCE ================= */
router.get("/", getIntelligence);

export default router;