import Message from "../models/Message.js";
import { logActivity } from "../utils/activityLogger.js";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";

/* ⭐ SAFE AI IMPORT */
import * as ai from "../services/aiService.js";

/* ================= GET MESSAGES ================= */
export const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (req, res) => {
  try {
    const {
      groupId,
      senderId,
      senderName,
      text,
      type,
      fileUrl,
      filePath,
      time,
      mentions,
      requiresApproval,
      approvalStatus,
    } = req.body;

    let finalFilePath = filePath;

    if (!finalFilePath && fileUrl && fileUrl.includes("/uploads/")) {
      const filename = fileUrl.split("/uploads/")[1]?.split("?")[0];
      if (filename) {
        finalFilePath = path.resolve(process.cwd(), "uploads", filename);
      }
    }

    const message = await Message.create({
      groupId,
      senderId,
      senderName,
      text,
      type: type || "text",
      fileUrl: fileUrl || null,
      filePath: finalFilePath || null,
      time,
      mentions: mentions || [],
      requiresApproval,
      approvalStatus,
      readBy: [],
    });

    runAI(message, req, finalFilePath).catch(err =>
      console.error("AI background error:", err)
    );

    await logActivity({
      userId: senderId,
      groupId: message.groupId,
      action: "message_sent",
      entityType: "message",
      entityId: message._id,
      metadata: {
        text: message.text || "",
        type: message.type || "text",
        fileUrl: message.fileUrl || null,
      },
    });

    const io = req.app.get("io");
    io.to(message.groupId).emit("newMessage", message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/* ================= AI BACKGROUND ================= */
export async function runAI(message, req, uploadedFilePath = "") {
  try {
    const io = req.app.get("io");

    const resolveLocalUploadPath = (rawPath) => {
      if (!rawPath || typeof rawPath !== "string") return "";

      let candidate = rawPath.trim();
      if (!candidate) return "";

      if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        try {
          const parsed = new URL(candidate);
          candidate = decodeURIComponent(parsed.pathname || "");
        } catch {
          return "";
        }
      }

      candidate = candidate.replace(/\\/g, "/");
      candidate = candidate.split("?")[0].split("#")[0];

      if (path.isAbsolute(candidate)) return candidate;

      const cleaned = candidate.replace(/^\/+/, "");
      return path.resolve(process.cwd(), cleaned);
    };

    /* ⭐ FIXED VOICE TRANSCRIPTION (Render delay fix) */
    if (message.type === "voice" && ai.transcribeVoiceMessage) {
      const localAudioPath =
        resolveLocalUploadPath(uploadedFilePath) ||
        resolveLocalUploadPath(message.filePath) ||
        resolveLocalUploadPath(message.fileUrl);

      if (!localAudioPath) return;

      /* ⭐ wait small delay */
      await new Promise(r => setTimeout(r, 1500));

      if (!fs.existsSync(localAudioPath)) {
        console.log("VOICE FILE NOT FOUND:", localAudioPath);
        return;
      }

      const transcript = await ai.transcribeVoiceMessage(localAudioPath);

      message.transcription = transcript;
      await message.save();
      io.to(message.groupId).emit("messageUpdated", message);

      if (transcript && ai.generateMessageSummary) {
        const summary = await ai.generateMessageSummary(transcript);
        message.aiSummary = summary;
        await message.save();
        io.to(message.groupId).emit("messageUpdated", message);
      }
    }
  } catch (err) {
    console.error("AI processing failed:", err);
  }
}

/* ================= MARK READ ================= */
export const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const alreadyRead = message.readBy?.find(r => r.userId === userId);

    if (!alreadyRead) {
      message.readBy.push({
        userId,
        readAt: new Date(),
      });

      await message.save();
    }

    const io = req.app.get("io");
    io.to(message.groupId).emit("messageUpdated", message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};