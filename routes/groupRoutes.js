import express from "express";
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from "../controllers/groupController.js";

const router = express.Router();

/* GET all groups */
router.get("/", getGroups);

/* CREATE group */
router.post("/", createGroup);

/* UPDATE group (add members) */
router.put("/:id", updateGroup);

/* DELETE group */
router.delete("/:id", deleteGroup);

export default router;
