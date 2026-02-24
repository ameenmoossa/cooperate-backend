import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },

    // NEW FIELDS
    groupType: {
      type: String,
      enum: ["project", "department", "company", "management", "temporary"],
      default: "project",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    members: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
