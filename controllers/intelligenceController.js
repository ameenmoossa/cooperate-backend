import Message from "../models/Message.js";
import * as ai from "../services/aiService.js";

/* ======================================================
   GET AI INTELLIGENCE (Summary + Actions + Decisions)
====================================================== */
export const getIntelligence = async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: "groupId required" });
    }

    /* ================= RECENT MESSAGES ================= */
    const messages = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(40);

    if (!messages.length) {
      return res.json({
        meetingSummary: "",
        actionItems: [],
        decisions: [],
      });
    }

    /* ================= BUILD TEXT ================= */
    const text = messages
      .reverse()
      .map((m) => `${m.senderName || "User"}: ${m.transcription || m.text || ""}`)
      .join("\n")
      .slice(0, 6000);

    /* ================= MEETING SUMMARY ================= */
    let meetingSummary = "";
    if (ai.generateMessageSummary) {
      meetingSummary = await ai.generateMessageSummary(text);
    }

    /* ================= ACTION ITEMS ================= */
    let actionItems = [];
    if (ai.generateAIReply) {
      const actionPrompt = `
Extract action items from this conversation.
Return as bullet list.
Conversation:
${text}
`;

      const actionResult = await ai.generateAIReply(actionPrompt);

      actionItems = actionResult
        ? actionResult.split("\n").filter(Boolean)
        : [];
    }

    /* ================= DECISIONS ================= */
    let decisions = [];
    if (ai.generateAIReply) {
      const decisionPrompt = `
Extract decisions made in this conversation.
Return as bullet list.
Conversation:
${text}
`;

      const decisionResult = await ai.generateAIReply(decisionPrompt);

      decisions = decisionResult
        ? decisionResult.split("\n").filter(Boolean)
        : [];
    }

    res.json({
      meetingSummary,
      actionItems,
      decisions,
    });
  } catch (err) {
    console.error("Intelligence error:", err);
    res.status(500).json({ error: "Failed to load intelligence" });
  }
};