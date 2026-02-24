import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema({
  title: String,
  requester: String,
  content: String,
  groupId: String,
  status: {
    type: String,
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Approval", approvalSchema);
