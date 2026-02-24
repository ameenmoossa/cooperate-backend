import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "corpconnect_dev_secret";

export const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId || payload.id || payload._id;

    if (!userId) {
      return res.status(401).json({ message: "Token payload missing user id" });
    }

    const authUser = await User.findById(userId).select("_id role status");

    if (!authUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!["admin", "manager"].includes(authUser.role)) {
      return res.status(403).json({ message: "Admin or manager access required" });
    }

    req.authUserId = authUser._id.toString();
    req.authUser = authUser;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
