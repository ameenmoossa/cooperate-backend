import express from "express";
import {
  createPoll,
  getPollsByGroup,
  votePoll,
  closePoll,
} from "../controllers/pollController.js";

const router = express.Router();

/* CREATE POLL */
router.post("/", createPoll);

/* GET POLLS BY GROUP */
router.get("/:groupId", getPollsByGroup);

/* VOTE IN POLL */
router.post("/vote/:pollId", votePoll);

/* CLOSE POLL */
router.post("/close/:pollId", closePoll);

export default router;
