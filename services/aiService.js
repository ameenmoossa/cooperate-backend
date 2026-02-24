import "dotenv/config";
import fs from "fs";
import Groq from "groq-sdk";

/* =====================================================
   🔐 ENV VALIDATION
===================================================== */
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ GROQ_API_KEY missing in .env");
}

/* =====================================================
   🚀 GROQ INIT
===================================================== */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =====================================================
   🛠 COMMON SAFE EXECUTOR
===================================================== */
const safeGroqCall = async (fn, label) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`Groq ${label} failed:`, err?.message || err);
    return null;
  }
};

/* =====================================================
   🎤 VOICE TRANSCRIPTION
===================================================== */
export const transcribeVoiceMessage = async (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return "";

  const result = await safeGroqCall(
    () =>
      groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
        response_format: "json",
      }),
    "transcription"
  );

  return result?.text || "";
};

/* =====================================================
   🧠 MESSAGE SUMMARY
===================================================== */
export const generateMessageSummary = async (text) => {
  if (!text) return "";

  const trimmedText = text.slice(0, 6000);

  const result = await safeGroqCall(
    () =>
      groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You summarize group chat discussions clearly in short bullet points.",
          },
          {
            role: "user",
            content: trimmedText,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    "summary"
  );

  return result?.choices?.[0]?.message?.content || "";
};

/* =====================================================
   🤖 AI ASSISTANT REPLY (you WILL use soon)
===================================================== */
export const generateAIReply = async (prompt) => {
  if (!prompt) return "";

  const result = await safeGroqCall(
    () =>
      groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant inside a workplace chat app. Be helpful and concise.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    "ai reply"
  );

  return result?.choices?.[0]?.message?.content || "";
};

/* =====================================================
   ⭐ GROUP SUMMARY FROM MESSAGES ARRAY
   (SUPER IMPORTANT — you will use this)
===================================================== */
export const summarizeMessagesArray = async (messages = []) => {
  if (!messages.length) return "";

  const text = messages
    .map((m) => `${m.senderName || "User"}: ${m.text || ""}`)
    .join("\n")
    .slice(0, 6000);

  return generateMessageSummary(text);
};