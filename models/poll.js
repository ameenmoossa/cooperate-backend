import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: String }], // user names or IDs
});

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },

    options: [optionSchema],

    createdBy: { type: String }, // user name or ID
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Poll", pollSchema);



