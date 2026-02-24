import express from "express";
import {
  getMessages,
  sendMessage,
  markMessageAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/:groupId", getMessages);
router.post("/", sendMessage);
router.put("/:id/read", markMessageAsRead);

export default router;
