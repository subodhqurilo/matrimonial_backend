import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Map: userId → Set(socketIds)
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🔗 Connected:", socket.id);

    // ---------------------------------------------------------
    // 1️⃣ ADD USER (JOIN ONLINE)
    // ---------------------------------------------------------
    socket.on("add-user", (userId) => {
      if (!userId) return;

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());

      // Add this socket to user
      onlineUsers.get(userId).add(socket.id);

      socket.join(String(userId));

      console.log("🟢 User connected:", userId, "Sockets:", onlineUsers.get(userId).size);

      // Broadcast updated online users
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // ---------------------------------------------------------
    // 2️⃣ SEND MESSAGE
    // ---------------------------------------------------------
    socket.on("send-msg", async ({ from, to, messageText, replyToId, tempId }) => {
      try {
        if (!from || !to || !messageText) return;

        const conversationId = [String(from), String(to)].sort().join("_");

        let message = await messageModel.create({
          senderId: from,
          receiverId: to,
          conversationId,
          messageText,
          replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
          files: [],
          status: "sent",
          tempId,
        });

        message = await messageModel.findById(message._id).populate("replyTo");

        // Send to receiver
        io.to(String(to)).emit("msg-receive", message);

        // Confirm to sender
        io.to(String(from)).emit("msg-sent", message);

      } catch (err) {
        console.error("send-msg error:", err);
      }
    });

    // ---------------------------------------------------------
    // 3️⃣ GET MESSAGES
    // ---------------------------------------------------------
    socket.on("get-messages", async ({ from, to }) => {
      try {
        const conversationId = [String(from), String(to)].sort().join("_");

        const msgs = await messageModel
          .find({ conversationId })
          .populate("replyTo")
          .sort({ createdAt: 1 });

        socket.emit("messages-history", msgs);
      } catch (err) {
        console.error(err);
      }
    });

    // ---------------------------------------------------------
    // 4️⃣ READ RECEIPT
    // ---------------------------------------------------------
    socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
      try {
        await messageModel.updateMany(
          {
            conversationId,
            receiverId: readerId,
            status: { $ne: "read" },
          },
          { $set: { status: "read", readAt: new Date() } }
        );

        io.to(String(otherUserId)).emit("messageRead", { conversationId, readerId });

      } catch (err) {
        console.error("Read ack error:", err);
      }
    });

    // ---------------------------------------------------------
    // 5️⃣ DISCONNECT (HANDLE MULTIPLE TABS)
    // ---------------------------------------------------------
    socket.on("disconnect", async () => {
      console.log("🔌 Disconnected:", socket.id);

      let targetUser = null;

      // Find which user this socket belonged to
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id); // remove this socket

          // If user has NO OTHER sockets → now they're offline
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            targetUser = userId;
          }
          break;
        }
      }

      // If targetUser is fully offline now
      if (targetUser) {
        await RegisterModel.findByIdAndUpdate(targetUser, { lastSeen: new Date() });
        io.emit("user-offline", targetUser);
        console.log("🔴 User offline:", targetUser);
      }

      // Always send updated online list
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
