import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    senderId: String,
    senderName: String,

    /* TEXT */
    text: String,

    /* ⭐ MEDIA */
    type: {
      type: String,
      default: "text", // text | image | video | file | voice
    },

    fileUrl: {
      type: String,
      default: null,
    },

    // ⭐ ADD THIS (REQUIRED FOR AI)
    filePath: {
      type: String,
      default: null,
    },

    /* ================= AI ================= */

    transcription: {
      type: String,
      default: null,
    },

    documentText: {
      type: String,
      default: null,
    },

    aiSummary: {
      type: String,
      default: null,
    },

    aiMeta: {
      type: Object,
      default: null,
    },

    /* ================= TIME ================= */

    time: String,

    /* READ RECEIPTS */
    isDelivered: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    /* APPROVAL */
    requiresApproval: Boolean,
    approvalStatus: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Message", messageSchema);
