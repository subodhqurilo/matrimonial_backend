import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🔗 Socket connected:", socket.id);

    /* =====================================================
        1️⃣ USER CONNECT → ADD ONLINE USER
    ===================================================== */
    socket.on("add-user", (userId) => {
      if (!userId) return;

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      socket.join(String(userId));
      console.log("🟢 User online:", userId);

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    /* =====================================================
        2️⃣ SEND MESSAGE (NO DUPLICATE, NO DOUBLE EMIT)
    ===================================================== */
    socket.on("send-msg", async ({ from, to, messageText, replyToId, tempId }) => {
      try {
        if (!from || !to) return;
        if (!messageText?.trim()) return;

        const conversationId = [String(from), String(to)].sort().join("_");

        const msgData = {
          senderId: from,
          receiverId: to,
          conversationId,
          messageText,
          files: [], // files only backend API handles
          replyTo: replyToId
            ? mongoose.Types.ObjectId.createFromHexString(String(replyToId))
            : null,
          status: "sent",
          tempId,
        };

        let message = await messageModel.create(msgData);

        message = await messageModel.findById(message._id).populate("replyTo");

        // === ⭐ NO DUPLICATES TRICK ⭐ ===
        // Receiver ko sirf receive event
        if (String(to) !== String(from)) {
          io.to(String(to)).emit("msg-receive", message);
        }

        // Sender ko sirf "msg-sent" (confirmation)
        io.to(String(from)).emit("msg-sent", message);

      } catch (err) {
        console.error("❌ socket send-msg error:", err);
      }
    });

    /* =====================================================
        3️⃣ FETCH OLD MESSAGES
    ===================================================== */
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

    /* =====================================================
        4️⃣ READ RECEIPTS
    ===================================================== */
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

        io.to(String(otherUserId)).emit("messageRead", {
          conversationId,
          readerId,
        });
      } catch (err) {
        console.error("Read ack error:", err);
      }
    });

    /* =====================================================
        5️⃣ USER DISCONNECT
    ===================================================== */
    socket.on("disconnect", async () => {
      let disconnectedUser = null;

      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.delete(socket.id)) {
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            disconnectedUser = userId;
          }
          break;
        }
      }

      if (disconnectedUser) {
        await RegisterModel.findByIdAndUpdate(disconnectedUser, {
          lastSeen: new Date(),
        });

        io.emit("user-offline", disconnectedUser);
        console.log("🔴 User offline:", disconnectedUser);
      }
    });
  });
};

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
