import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    action: {
      type: String,
      required: true,
      // examples: message_sent, file_uploaded, approval_done
    },

    entityType: {
      type: String,
      required: true,
      // message | file | call | approval | poll | group | user
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
