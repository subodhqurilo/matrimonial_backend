import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users (userId -> Set<socketId>)
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    /* =====================================================
       1️⃣ USER ONLINE JOIN
    ===================================================== */
    socket.on("add-user", (userId) => {
      if (!userId) return;

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      socket.join(String(userId));

      console.log(`👤 User online: ${userId}`);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    /* =====================================================
       2️⃣ PUSH NOTIFICATION FOR MOBILE
    ===================================================== */
    socket.on("newNotification", (data) => {
      console.log("📢 Notification:", data);
    });

    socket.on("send-notification", ({ userId, title, message }) => {
      if (!userId) return;
      io.to(String(userId)).emit("newNotification", {
        title,
        message,
        createdAt: new Date(),
      });
      console.log("🔔 Notification sent to user:", userId);
    });

    /* =====================================================
       3️⃣ REAL-TIME TYPING INDICATOR
    ===================================================== */
    socket.on("typing", ({ from, to }) => {
      if (!from || !to) return;
      io.to(String(to)).emit("user-typing", { from, to });
    });

    socket.on("stop-typing", ({ from, to }) => {
      if (!from || !to) return;
      io.to(String(to)).emit("user-stop-typing", { from, to });
    });

    /* =====================================================
       4️⃣ SEND MESSAGE
    ===================================================== */
    socket.on("send-msg", async ({ from, to, messageText, files, tempId }) => {
      try {
        if (!from || !to || (!messageText && (!files || files.length === 0)))
          return;

        const conversationId = [String(from), String(to)].sort().join("_");

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
          tempId,
        };

        let message = await messageModel.create(messageData);

        const isReceiverOnline = onlineUsers.has(String(to));

        // If online — mark as delivered
        if (isReceiverOnline) {
          await messageModel.updateOne(
            { _id: message._id },
            { $set: { status: "delivered", deliveredAt: new Date() } }
          );

          message = await messageModel.findById(message._id);

          // SEND "DELIVERED" update back to sender
          io.to(String(from)).emit("messageDelivered", {
            messageId: message._id,
            deliveredAt: message.deliveredAt,
          });

          // Receiver gets live message
          io.to(String(to)).emit("msg-receive", message);
        } else {
          // Receiver offline → still send message
          io.to(String(to)).emit("msg-receive", message);
        }

        // SEND "Message Sent" confirmation to sender
        io.to(String(from)).emit("msg-sent", message);

        console.log(`📨 ${from} → ${to}: ${messageText}`);
      } catch (err) {
        console.error("🚨 send-msg error:", err);
        socket.emit("errorMessage", { error: "Message send failed" });
      }
    });

    /* =====================================================
       5️⃣ FETCH MESSAGES (History)
    ===================================================== */
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

    /* =====================================================
       6️⃣ MARK AS READ (Backend + Socket)
    ===================================================== */
    socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
      try {
        await messageModel.updateMany(
          {
            conversationId,
            receiverId: new mongoose.Types.ObjectId(String(readerId)),
            status: { $ne: "read" },
          },
          { $set: { status: "read", readAt: new Date() } }
        );

        // Notify sender that messages are read
        io.to(String(otherUserId)).emit("messageRead", {
          conversationId,
          readerId,
        });
      } catch (err) {
        console.error("message-read-ack error:", err);
      }
    });

    /* =====================================================
       7️⃣ DISCONNECT → UPDATE LAST SEEN
    ===================================================== */
    socket.on("disconnect", async () => {
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

        try {
          await RegisterModel.findByIdAndUpdate(disconnectedUser, {
            lastSeen: new Date(),
          });

          io.emit("user-offline", disconnectedUser);
        } catch (err) {
          console.error("❌ lastSeen update error:", err);
        }
      } else {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      }

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

// Helper
export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
