import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";

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

    // 📩 Send message
 socket.on("send-msg", async ({ from, to, messageText, files, tempId }) => {

    try {
        if (!from || !to || (!messageText && (!files || files.length === 0))) return;

        const conversationId = [String(from), String(to)].sort().join("_");

        // ✅ Sanitize files
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
      tempId, // ✅ add this
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
        }


  io.to(String(from)).emit("msg-sent", {
     ...message.toObject(),
     tempId, // same tempId jo frontend ne bheja tha
   });


        console.log(`📨 ${from} → ${to}: ${messageText}`);
      } catch (err) {
        console.error("🚨 send-msg error:", err);
        socket.emit("errorMessage", { error: "Message send failed" });
      }
    });

    // 📜 Fetch messages in a conversation
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

    // ✅ Mark messages as read (for read receipts)
    socket.on("mark-as-read", async ({ from, to }) => {
  try {
    if (!from || !to) return;

    const conversationId = [String(from), String(to)].sort().join("_");

    await messageModel.updateMany(
      {
        conversationId,
        receiverId: new mongoose.Types.ObjectId(String(from)), // ✅ the READER
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    );

    // Notify both participants
    io.to(String(from)).emit("messages-read", { conversationId, reader: from });
    io.to(String(to)).emit("messages-read", { conversationId, reader: from });
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
