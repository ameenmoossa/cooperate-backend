import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    profile: {
      name: { type: String, default: "" },
      avatar: { type: String, default: "" },
      designation: { type: String, default: "" },
      department: { type: String, default: "" },
      bio: { type: String, default: "" },
    },
    notifications: {
      chatNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
      mentionAlerts: { type: Boolean, default: false },
      approvalAlerts: { type: Boolean, default: false },
    },
    ai: {
      enableAssistant: { type: Boolean, default: true },
      enableChatSummarization: { type: Boolean, default: false },
      enableTaskSuggestions: { type: Boolean, default: false },
      enableVoiceTranscription: { type: Boolean, default: true },
    },
    privacy: {
      lastSeenVisibility: {
        type: String,
        enum: ["everyone", "contacts", "nobody"],
        default: "everyone",
      },
      readReceipts: { type: Boolean, default: true },
      profileVisibility: {
        type: String,
        enum: ["everyone", "contacts", "private"],
        default: "everyone",
      },
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserSettings", userSettingsSchema);
