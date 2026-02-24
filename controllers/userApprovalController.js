import User from "../models/User.js";

/* Get all pending users */
export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: "pending" }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Approve user */
export const approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).select("-password");

    res.json({ message: "User approved", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Reject user */
export const rejectUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User rejected and removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
