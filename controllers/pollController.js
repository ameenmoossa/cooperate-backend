import Poll from "../models/poll.js";

/* =========================
   CREATE POLL
========================= */
export const createPoll = async (req, res) => {
  try {
    const { question, options, groupId, createdBy } = req.body;

    if (!question || !options || options.length < 2) {
      return res
        .status(400)
        .json({ error: "Question and at least 2 options required" });
    }

    const poll = await Poll.create({
      question,
      groupId,
      createdBy,
      options: options.map((opt) => ({
        text: opt,
        votes: [],
      })),
    });

    res.status(201).json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create poll" });
  }
};

/* =========================
   GET POLLS BY GROUP
========================= */
export const getPollsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const polls = await Poll.find({ groupId }).sort({
      createdAt: -1,
    });

    res.json(polls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
};

/* =========================
   VOTE IN POLL
========================= */
export const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex, user } = req.body;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    if (poll.isClosed) {
      return res.status(400).json({ error: "Poll is closed" });
    }

    // Remove previous vote
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v !== user);
    });

    // Add new vote
    poll.options[optionIndex].votes.push(user);

    await poll.save();

    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to vote" });
  }
};

/* =========================
   CLOSE POLL
========================= */
export const closePoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findByIdAndUpdate(
      pollId,
      { isClosed: true },
      { new: true }
    );

    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close poll" });
  }
};
