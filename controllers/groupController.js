import Group from "../models/Group.js";

/* =========================
   GET ALL GROUPS
========================= */
export const getGroups = async (req, res) => {
  try {
    const now = new Date();

    await Group.updateMany(
      {
        endDate: { $lt: now },
        isArchived: false,
      },
      { $set: { isArchived: true } }
    );

    const groups = await Group.find().sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

/* =========================
   CREATE GROUP
========================= */
export const createGroup = async (req, res) => {
  try {
    const { name, description, members, groupType, startDate, endDate } =
      req.body;

    if (!name) {
      return res.status(400).json({ error: "Group name required" });
    }

    const group = new Group({
      name,
      description: description || "",
      members: members || [],
      groupType: groupType || "project",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isArchived: false,
    });

    const savedGroup = await group.save();
    res.status(201).json(savedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
};

/* =========================
   UPDATE GROUP (ADD MEMBER)
========================= */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;

    const updated = await Group.findByIdAndUpdate(
      id,
      { members },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   DELETE GROUP
========================= */
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Group.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
