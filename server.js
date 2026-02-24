


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";

import groupRoutes from "./routes/groupRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userApprovalRoutes from "./routes/userApprovalRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { seedRbacDefaults } from "./utils/seedRbac.js";
import settingsAdminRoutes from "./routes/settingsAdminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

/* ⭐ NEW */
import intelligenceRoutes from "./routes/intelligenceRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user-approvals", userApprovalRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/settings-admin", settingsAdminRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

/* ⭐ NEW */
app.use("/api/intelligence", intelligenceRoutes);

app.get("/", (req, res) => {
  res.send("CorpConnect API running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

const onlineUsers = {};
app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`Socket joined group ${groupId}`);
  });

  socket.on("join-call", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    socket.join(roomId);
    console.log(`User joined call room ${roomId}`);

    if (numClients === 0) {
      socket.emit("role", "caller");
    } else {
      socket.emit("role", "receiver");
      socket.to(roomId).emit("user-joined", roomId);
    }
  });

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", { roomId, offer });
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", { roomId, answer });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { roomId, candidate });
  });

  socket.on("end-call", (roomId) => {
    socket.to(roomId).emit("call-ended");
    socket.leave(roomId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedRbacDefaults();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();













