// import Approval from "../models/Approval.js";

// export const getApprovals = async (req, res) => {
//   const approvals = await Approval.find();
//   res.json(approvals);
// };

// export const createApproval = async (req, res) => {
//   const approval = await Approval.create(req.body);
//   res.json(approval);
// };

// export const approveRequest = async (req, res) => {
//   const approval = await Approval.findByIdAndUpdate(
//     req.params.id,
//     { status: "approved" },
//     { new: true }
//   );
//   res.json(approval);
// };

// export const rejectRequest = async (req, res) => {
//   const approval = await Approval.findByIdAndUpdate(
//     req.params.id,
//     { status: "rejected" },
//     { new: true }
//   );
//   res.json(approval);
// };















import Approval from "../models/Approval.js";
import { logActivity } from "../utils/activityLogger.js";

/* GET ALL APPROVALS */
export const getApprovals = async (req, res) => {
  try {
    const approvals = await Approval.find();
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
};

/* CREATE APPROVAL */
export const createApproval = async (req, res) => {
  try {
    const approval = await Approval.create(req.body);

    /* ✅ ACTIVITY LOG — approval created */
    await logActivity({
      userId: req.body.userId,
      groupId: approval.groupId,
      action: "approval_created",
      entityType: "approval",
      entityId: approval._id,
    });

    res.json(approval);
  } catch (err) {
    res.status(500).json({ error: "Failed to create approval" });
  }
};

/* APPROVE */
export const approveApproval = async (req, res) => {
  try {
    const approval = await Approval.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    /* ✅ ACTIVITY LOG — approved */
    await logActivity({
      userId: req.body.userId,
      groupId: approval?.groupId,
      action: "approval_approved",
      entityType: "approval",
      entityId: approval?._id,
    });

    res.json(approval);
  } catch (err) {
    res.status(500).json({ error: "Approve failed" });
  }
};

/* REJECT */
export const rejectApproval = async (req, res) => {
  try {
    const approval = await Approval.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    /* ✅ ACTIVITY LOG — rejected */
    await logActivity({
      userId: req.body.userId,
      groupId: approval?.groupId,
      action: "approval_rejected",
      entityType: "approval",
      entityId: approval?._id,
    });

    res.json(approval);
  } catch (err) {
    res.status(500).json({ error: "Reject failed" });
  }
};
