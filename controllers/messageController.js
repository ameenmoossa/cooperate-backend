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

    /* CREATE MESSAGE */
    const message = await Message.create({
      groupId,
      senderId,
      senderName,
      text,
      type: type || "text",
      fileUrl: fileUrl || null,
      filePath: filePath || null, // ⭐ REQUIRED FIX
      time,
      mentions: mentions || [],
      requiresApproval,
      approvalStatus,
      readBy: [],
    });

    /* ================= SAFE AI (BACKGROUND — NO CRASH) ================= */
    runAI(message, req, filePath).catch((err) =>
      console.error("AI background error:", err)
    );

    /* ACTIVITY LOG */
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
const MAX_DOC_TEXT = 6000;

const normalizeExtractedText = (text = "") =>
  String(text).replace(/\s+/g, " ").trim().slice(0, MAX_DOC_TEXT);

const decodePdfString = (value = "") =>
  value
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");

const extractTextFromPdfBuffer = (buffer) => {
  const raw = buffer.toString("latin1");
  const chunks = [];

  const tjRegex = /\(([^()]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded.trim()) chunks.push(decoded);
  }

  const tjArrayRegex = /\[(.*?)\]\s*TJ/gs;
  while ((match = tjArrayRegex.exec(raw)) !== null) {
    const inner = match[1];
    const parts = inner.match(/\(([^()]*)\)/g) || [];
    parts.forEach((part) => {
      const decoded = decodePdfString(part.slice(1, -1));
      if (decoded.trim()) chunks.push(decoded);
    });
  }

  return normalizeExtractedText(chunks.join(" "));
};

const extractReadableStrings = (buffer) => {
  // Fallback for binary files: pick printable strings with min length 4
  const raw = buffer.toString("latin1");
  const matches = raw.match(/[ -~\n\r\t]{4,}/g) || [];
  return normalizeExtractedText(matches.join(" "));
};

const extractDocumentText = async (filePath, fileName = "") => {
  if (!filePath || !fs.existsSync(filePath)) return "";

  const ext = path.extname(fileName || filePath).toLowerCase();

  try {
    if (ext === ".pdf") {
      const buffer = await fsp.readFile(filePath);

      // 1) Preferred parser
      try {
        const pdfParseMod = await import("pdf-parse");
        const pdfParse = pdfParseMod?.default || pdfParseMod;
        const parsed = await pdfParse(buffer);
        const text = normalizeExtractedText(parsed?.text || "");
        if (text) return text;
      } catch {
        // continue to fallback parser
      }

      // 2) Simple low-level parser fallback
      const parsedFallback = extractTextFromPdfBuffer(buffer);
      if (parsedFallback) return parsedFallback;

      // 3) Printable strings fallback
      return extractReadableStrings(buffer);
    }

    if (ext === ".docx") {
      const buffer = await fsp.readFile(filePath);
      try {
        const mammothMod = await import("mammoth");
        const mammoth = mammothMod?.default || mammothMod;
        const result = await mammoth.extractRawText({ buffer });
        const text = normalizeExtractedText(result?.value || "");
        if (text) return text;
      } catch {
        // continue to fallback
      }
      return extractReadableStrings(buffer);
    }

    if ([".txt", ".csv", ".md", ".json", ".log"].includes(ext)) {
      const text = await fsp.readFile(filePath, "utf8");
      return normalizeExtractedText(text);
    }

    const fallbackBuffer = await fsp.readFile(filePath);
    try {
      return normalizeExtractedText(fallbackBuffer.toString("utf8"));
    } catch {
      return extractReadableStrings(fallbackBuffer);
    }
  } catch {
    return "";
  }
};

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

    /* VOICE TRANSCRIPTION */
    if (message.type === "voice" && ai.transcribeVoiceMessage) {
      const localAudioPath =
        resolveLocalUploadPath(uploadedFilePath) ||
        resolveLocalUploadPath(message.filePath) ||
        resolveLocalUploadPath(message.fileUrl);

      if (!localAudioPath) return;

      const transcript = await ai.transcribeVoiceMessage(localAudioPath);

      message.transcription = transcript;
      await message.save();
      io.to(message.groupId).emit("messageUpdated", message);

      /* SUMMARY FROM TRANSCRIPT */
      if (transcript && ai.generateMessageSummary) {
        const summary = await ai.generateMessageSummary(transcript);
        message.aiSummary = summary;
        await message.save();

        io.to(message.groupId).emit("messageUpdated", message);
      }
    }

    /* TEXT SUMMARY */
    if (message.type === "text" && message.text && ai.generateMessageSummary) {
      const summary = await ai.generateMessageSummary(message.text);
      message.aiSummary = summary;
      await message.save();

      io.to(message.groupId).emit("messageUpdated", message);
    }

    /* DOCUMENT SUMMARY */
    if (message.type === "file" && ai.generateMessageSummary) {
      message.aiMeta = {
        ...(message.aiMeta || {}),
        documentStatus: "processing",
      };
      await message.save();
      io.to(message.groupId).emit("messageUpdated", message);

      const localDocPath =
        resolveLocalUploadPath(uploadedFilePath) ||
        resolveLocalUploadPath(message.filePath) ||
        resolveLocalUploadPath(message.fileUrl);

      if (!localDocPath) return;

      const extractedText = await extractDocumentText(localDocPath, message.text || "");
      if (!extractedText) {
        message.documentText = null;
        message.aiSummary = message.aiSummary || "Unable to extract text from document.";
        message.aiMeta = {
          ...(message.aiMeta || {}),
          documentStatus: "failed",
          reason: "Text extraction failed",
        };
        await message.save();
        io.to(message.groupId).emit("messageUpdated", message);
        return;
      }

      message.documentText = extractedText;
      message.transcription = extractedText;
      await message.save();
      io.to(message.groupId).emit("messageUpdated", message);

      const summary = await ai.generateMessageSummary(extractedText);
      message.aiSummary = summary || message.aiSummary;

      if (ai.generateAIReply) {
        const actionPrompt = `Extract concise action items from this document text. Return each item in a new line.\n\n${extractedText}`;
        const actionsRaw = await ai.generateAIReply(actionPrompt);
        const actionItems = String(actionsRaw || "")
          .split("\n")
          .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 10);

        message.aiMeta = {
          ...(message.aiMeta || {}),
          documentStatus: "done",
          actionItems,
        };
      }

      await message.save();
      io.to(message.groupId).emit("messageUpdated", message);
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
    if (!message) return res.status(404).json({ error: "Message not found" });

    const alreadyRead = message.readBy?.find((r) => r.userId === userId);

    if (!alreadyRead) {
      message.readBy.push({
        userId,
        readAt: new Date(),
      });

      await message.save();

      await logActivity({
        userId,
        groupId: message.groupId,
        action: "message_read",
        entityType: "message",
        entityId: message._id,
      });
    }

    const io = req.app.get("io");
    io.to(message.groupId).emit("messageUpdated", message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};
