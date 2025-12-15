// import mongoose from "mongoose";
// import messageModel from "./src/modal/messageModel.js";
// import RegisterModel from "./src/modal/register.js";

// // Track online users (userId → Set<socketIds>)
// const onlineUsers = new Map();

// export const socketHandler = (io) => {
//   io.on("connection", (socket) => {
//     console.log(`🔗 Socket connected: ${socket.id}`);

//     /* =====================================================
//        1️⃣ USER ONLINE JOIN
//     ===================================================== */
//     socket.on("add-user", (userId) => {
//       if (!userId) return;

//       if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
//       onlineUsers.get(userId).add(socket.id);

//       socket.join(String(userId));

//       console.log(`🟢 User online: ${userId}`);
//       io.emit("onlineUsers", Array.from(onlineUsers.keys()));
//     });

//     /* =====================================================
//        2️⃣ PUSH NOTIFICATION EVENTS
//     ===================================================== */
//     socket.on("send-notification", ({ userId, title, message }) => {
//       if (!userId) return;

//       io.to(String(userId)).emit("newNotification", {
//         title,
//         message,
//         createdAt: new Date(),
//       });

//       console.log("🔔 Notification sent to:", userId);
//     });

//     /* =====================================================
//        3️⃣ TYPING INDICATOR
//     ===================================================== */
//     socket.on("typing", ({ from, to }) => {
//       if (from && to) io.to(String(to)).emit("user-typing", { from });
//     });

//     socket.on("stop-typing", ({ from, to }) => {
//       if (from && to) io.to(String(to)).emit("user-stop-typing", { from });
//     });

//     /* =====================================================
//        4️⃣ SEND MESSAGE  ⭐ FIXED — NO DUPLICATE ANYWHERE
//     ===================================================== */
//     socket.on("send-msg", async ({ from, to, messageText, files, tempId }) => {
//       try {
//         if (!from || !to || (!messageText && (!files || files.length === 0)))
//           return;

//         const conversationId = [String(from), String(to)].sort().join("_");

//         const safeFiles = (files || []).map((f) => ({
//           fileName: f.fileName || "file",
//           fileUrl: f.fileUrl,
//           fileType: f.fileType || "application/octet-stream",
//           fileSize: f.fileSize || 0,
//         }));

//         // 1️⃣ Create DB message
//         let message = await messageModel.create({
//           senderId: new mongoose.Types.ObjectId(from),
//           receiverId: new mongoose.Types.ObjectId(to),
//           conversationId,
//           messageText: messageText || "",
//           files: safeFiles,
//           status: "sent",
//           tempId,
//         });

//         const isReceiverOnline = onlineUsers.has(String(to));

//         // 2️⃣ If receiver online → mark delivered
//         if (isReceiverOnline) {
//           await messageModel.updateOne(
//             { _id: message._id },
//             { $set: { status: "delivered", deliveredAt: new Date() } }
//           );

//           message = await messageModel.findById(message._id);

//           io.to(String(from)).emit("messageDelivered", {
//             messageId: message._id,
//             deliveredAt: message.deliveredAt,
//           });
//         }

//         // 3️⃣ Receiver gets message (ONLY 1 TIME)
//         io.to(String(to)).emit("msg-receive", message);

//         // 4️⃣ Sender gets msg confirmation
//         io.to(String(from)).emit("msg-sent", message);

//         console.log(`📨 ${from} → ${to}: ${messageText}`);
//       } catch (err) {
//         console.error("send-msg error:", err);
//         socket.emit("errorMessage", { error: "Message send failed" });
//       }
//     });

//     /* =====================================================
//        5️⃣ FETCH MESSAGE HISTORY
//     ===================================================== */
//     socket.on("get-messages", async ({ from, to }) => {
//       try {
//         const conversationId = [String(from), String(to)].sort().join("_");

//         const messages = await messageModel
//           .find({ conversationId })
//           .sort({ createdAt: 1 });

//         socket.emit("messages-history", messages);
//       } catch (err) {
//         console.error(err);
//       }
//     });

//     /* =====================================================
//        6️⃣ MARK MESSAGES AS READ
//     ===================================================== */
//     socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
//       try {
//         await messageModel.updateMany(
//           {
//             conversationId,
//             receiverId: new mongoose.Types.ObjectId(readerId),
//             status: { $ne: "read" },
//           },
//           { $set: { status: "read", readAt: new Date() } }
//         );

//         io.to(String(otherUserId)).emit("messageRead", {
//           conversationId,
//           readerId,
//         });
//       } catch (err) {
//         console.error("Read ack error:", err);
//       }
//     });

//     /* =====================================================
//        7️⃣ DISCONNECT — HANDLE LAST SEEN
//     ===================================================== */
//     socket.on("disconnect", async () => {
//       let disconnectedUser = null;

//       for (const [userId, sockets] of onlineUsers.entries()) {
//         if (sockets.delete(socket.id)) {
//           if (sockets.size === 0) {
//             onlineUsers.delete(userId);
//             disconnectedUser = userId;
//           }
//           break;
//         }
//       }

//       if (disconnectedUser) {
//         await RegisterModel.findByIdAndUpdate(disconnectedUser, {
//           lastSeen: new Date(),
//         });

//         io.emit("user-offline", disconnectedUser);
//         console.log(`🔴 User offline: ${disconnectedUser}`);
//       } else {
//         console.log(`🔌 Socket disconnected: ${socket.id}`);
//       }

//       io.emit("onlineUsers", Array.from(onlineUsers.keys()));
//     });
//   });
// };

// export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`:link: Socket connected: ${socket.id}`);

    /* =====================================================
        1️⃣ USER ONLINE JOIN
    ===================================================== */
    socket.on("add-user", (userId) => {
      if (!userId) return;

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      socket.join(String(userId));

      console.log(`:large_green_circle: User online: ${userId}`);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    /* =====================================================
        2️⃣ SEND MESSAGE (TEXT + FILE + REPLY)
        FRONTEND SENDS DIRECT FILE URL -> NO BASE64
    ===================================================== */
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

    // Receiver gets 1 time
    if (String(from) !== String(to)) {
      io.to(String(to)).emit("msg-receive", message);
    }

    // Sender gets confirmation
    io.to(String(from)).emit("msg-sent", message);

  } catch (err) {
    console.error("socket send-msg error:", err);
  }
});






    /* =====================================================
        3️⃣ GET MESSAGES
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
        4️⃣ READ RECEIPT
    ===================================================== */
    socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
      try {
        await messageModel.updateMany(
          {
            conversationId,
            receiverId: new mongoose.Types.ObjectId(readerId),
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
        console.log(`:red_circle: User offline: ${disconnectedUser}`);
      }
    });
  });
};

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());
