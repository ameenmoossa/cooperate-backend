import express from "express";
import {
  getApprovals,
  createApproval,
  approveApproval,
  rejectApproval,
} from "../controllers/approvalController.js";

const router = express.Router();

router.get("/", getApprovals);
router.post("/", createApproval);
router.put("/:id/approve", approveApproval);
router.put("/:id/reject", rejectApproval);

export default router;
