import Message from "../models/Message.js";
import { runAI } from "./messageController.js";

const triggerAI = async (req, res, expectedType) => {
  try {
    const { messageId, filePath } = req.body || {};
    if (!messageId) {
      return res.status(400).json({ error: "messageId is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (expectedType && message.type !== expectedType) {
      return res.status(400).json({ error: `Message is not of type ${expectedType}` });
    }

    res.status(202).json({ accepted: true });

    setImmediate(() => {
      runAI(message, req, filePath || message.filePath).catch((err) =>
        console.error("AI route background failed:", err)
      );
    });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to trigger AI processing" });
  }
};

export const processVoiceWithGroq = (req, res) => triggerAI(req, res, "voice");
export const processDocumentWithGroq = (req, res) => triggerAI(req, res, "file");

