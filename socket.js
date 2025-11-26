import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users (userId -> Set<socketId>)
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ➕ Add user to online list
    socket.on("add-user", (userId) => {
      if (!userId) return;

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      socket.join(String(userId));

      console.log(`👤 User online: ${userId}`);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // -------------------------------------------------------------------
    // 🔔 NOTIFICATION RECEIVER (from backend controller)
    // -------------------------------------------------------------------
    socket.on("newNotification", (data) => {
      console.log("📢 Received Notification (client emitted):", data);
    });

    // (optional) Client triggered notification event
    socket.on("send-notification", ({ userId, title, message }) => {
      if (!userId) return;

      io.to(String(userId)).emit("newNotification", {
        title,
        message,
        createdAt: new Date(),
      });

      console.log("🔔 Notification sent to user:", userId);
    });

    // 📩 Send message
    socket.on("send-msg", async ({ from, to, messageText, files }) => {
      try {
        if (!from || !to || (!messageText && (!files || files.length === 0)))
          return;

        const conversationId = [String(from), String(to)].sort().join("_");

        // Sanitize files
        const safeFiles = (files || []).map((f) => ({
          fileName: f.fileName || "unknown",
          fileUrl: f.fileUrl,
          fileType: f.fileType || "application/octet-stream",
          fileSize: f.fileSize || 0,
        }));

        const messageData = {
          senderId: new mongoose.Types.ObjectId(String(from)),
          receiverId: new mongoose.Types.ObjectId(String(to)),
          conversationId,
          messageText: messageText || "",
          files: safeFiles,
          status: "sent",
        };

        let message = await messageModel.create(messageData);

        // If receiver is online → mark delivered
        if (onlineUsers.has(String(to))) {
          await messageModel.updateOne(
            { _id: message._id },
            { $set: { status: "delivered" } }
          );
          message.status = "delivered";

          io.to(String(to)).emit("msg-receive", message);

          // 🔔 SEND NOTIFICATION WHEN RECEIVER GETS MESSAGE LIVE
          io.to(String(to)).emit("newNotification", {
            title: "New Message",
            message: messageText,
            type: "message",
            from: from,
            createdAt: new Date(),
          });
        }

        // Always confirm to sender
        io.to(String(from)).emit("msg-sent", message);

        console.log(`📨 ${from} → ${to}: ${messageText}`);
      } catch (err) {
        console.error("🚨 send-msg error:", err);
        socket.emit("errorMessage", { error: "Message send failed" });
      }
    });

    // 📜 Fetch messages
    socket.on("get-messages", async ({ from, to }) => {
      try {
        if (!from || !to) return;

        const conversationId = [String(from), String(to)].sort().join("_");

        const messages = await messageModel
          .find({ conversationId })
          .populate("senderId", "firstName lastName profileImage")
          .populate("receiverId", "firstName lastName profileImage")
          .sort({ createdAt: 1 });

        socket.emit("messages-history", messages);
      } catch (err) {
        console.error("🚨 get-messages error:", err);
        socket.emit("errorMessage", { error: "Failed to fetch messages" });
      }
    });

    // Mark messages as read
    socket.on("mark-as-read", async ({ from, to }) => {
      try {
        if (!from || !to) return;

        const conversationId = [String(from), String(to)].sort().join("_");

        await messageModel.updateMany(
          {
            conversationId,
            receiverId: new mongoose.Types.ObjectId(String(to)),
            status: { $ne: "read" },
          },
          { $set: { status: "read" } }
        );

        io.to(String(from)).emit("messages-read", {
          conversationId,
          reader: to,
        });

        io.to(String(to)).emit("messages-read", {
          conversationId,
          reader: to,
        });
      } catch (err) {
        console.error("🚨 mark-as-read error:", err);
        socket.emit("errorMessage", { error: "Failed to mark as read" });
      }
    });

    // ❌ Disconnect
    socket.on("disconnect", () => {
      let disconnectedUser = null;

      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            disconnectedUser = userId;
          }
          break;
        }
      }

      if (disconnectedUser) {
        console.log(`❌ User offline: ${disconnectedUser}`);
      } else {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      }

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

// Helper
export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
