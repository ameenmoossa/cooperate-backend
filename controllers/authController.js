import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "corpconnect_dev_secret";

const buildAuthResponse = (user) => {
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
};

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = role || "user";
    const userStatus = userRole === "manager" || userRole === "admin" ? "approved" : "pending";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      status: userStatus,
    });

    if (userStatus === "pending") {
      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");

      const managers = await User.find({ role: "manager" });

      managers.forEach((manager) => {
        const socketId = onlineUsers[manager._id];
        if (socketId) {
          io.to(socketId).emit("notification", {
            type: "user-approval",
            message: `New user "${user.name}" waiting for approval`,
            userId: user._id,
          });
        }
      });
    }

    return res.status(201).json({
      message:
        userStatus === "approved"
          ? "Account created and approved."
          : "Account created. Waiting for manager approval.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: "Your account is waiting for manager approval",
      });
    }

    return res.json(buildAuthResponse(user));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
