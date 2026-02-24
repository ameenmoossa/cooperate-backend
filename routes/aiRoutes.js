import express from "express";
import {
  processVoiceWithGroq,
  processDocumentWithGroq,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/voice/groq", processVoiceWithGroq);
router.post("/document/groq", processDocumentWithGroq);

export default router;

