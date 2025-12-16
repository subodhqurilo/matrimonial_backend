import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users (userId → Set<socketIds>)
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    /* =====================================================
        1️⃣ USER ONLINE JOIN
    ===================================================== */
    socket.on("add-user", (userId) => {
      if (!userId) {
        console.error("⚠️ No userId provided for add-user");
        socket.emit("error", { message: "User ID is required" });
        return;
      }

      try {
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        socket.join(String(userId));
        socket.userId = userId; // Store userId on socket for easy access

        console.log(`🟢 User online: ${userId} (socket: ${socket.id})`);
        
        // Broadcast updated online users list
        broadcastOnlineUsers(io);
        
        // Emit user online event to all except self
        socket.broadcast.emit("user-online", userId);
        
        // Update user's online status in DB
        RegisterModel.findByIdAndUpdate(userId, {
          $set: { onlineStatus: "online", lastSeen: null }
        }, { new: true }).catch(err => 
          console.error("Error updating online status:", err)
        );
        
        // Send confirmation to the user
        socket.emit("user-added", {
          userId,
          onlineUsers: getOnlineUserIds()
        });
      } catch (error) {
        console.error("Error in add-user:", error);
        socket.emit("error", { message: "Failed to add user" });
      }
    });

    /* =====================================================
        2️⃣ PUSH NOTIFICATION EVENTS
    ===================================================== */
    socket.on("send-notification", ({ userId, title, message, type = "info" }) => {
      if (!userId) {
        socket.emit("error", { message: "User ID required for notification" });
        return;
      }

      const notificationData = {
        title,
        message,
        type,
        createdAt: new Date(),
        read: false
      };

      io.to(String(userId)).emit("newNotification", notificationData);
      console.log(`🔔 Notification sent to ${userId}: ${title}`);
    });

    /* =====================================================
        3️⃣ TYPING INDICATOR
    ===================================================== */
    socket.on("typing", ({ from, to, conversationId }) => {
      if (!from || !to) {
        console.error("⚠️ Missing from/to in typing event");
        return;
      }

      // Check if users can communicate (not blocked)
      Promise.all([
        RegisterModel.findById(from).select("blockedUsers"),
        RegisterModel.findById(to).select("blockedUsers")
      ]).then(([sender, receiver]) => {
        const isBlocked = receiver?.blockedUsers?.includes(from) || 
                         sender?.blockedUsers?.includes(to);
        
        if (!isBlocked) {
          io.to(String(to)).emit("user-typing", { 
            from, 
            conversationId: conversationId || getConversationId(from, to)
          });
          console.log(`⌨️ ${from} is typing to ${to}`);
        }
      }).catch(err => console.error("Typing check error:", err));
    });

    socket.on("stop-typing", ({ from, to, conversationId }) => {
      if (from && to) {
        io.to(String(to)).emit("user-stop-typing", { 
          from,
          conversationId: conversationId || getConversationId(from, to)
        });
      }
    });

    /* =====================================================
        4️⃣ SEND MESSAGE (Text + Reply)
    ===================================================== */
    socket.on("send-msg", async ({ from, to, messageText, replyToId, tempId }) => {
      try {
        if (!from || !to || !messageText?.trim()) {
          socket.emit("error", { message: "Invalid message data" });
          return;
        }

        // Check block status before sending
        const [sender, receiver] = await Promise.all([
          RegisterModel.findById(from).select("blockedUsers"),
          RegisterModel.findById(to).select("blockedUsers")
        ]);

        const isBlocked = receiver?.blockedUsers?.includes(from);
        const youBlocked = sender?.blockedUsers?.includes(to);

        if (isBlocked || youBlocked) {
          socket.emit("message-blocked", { 
            to, 
            reason: "User is blocked" 
          });
          return;
        }

        const conversationId = getConversationId(from, to);

        // Create message in database
        let message = await messageModel.create({
          senderId: new mongoose.Types.ObjectId(from),
          receiverId: new mongoose.Types.ObjectId(to),
          conversationId,
          messageText: messageText.trim(),
          replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
          files: [],
          status: "sent",
          tempId,
        });

        // Populate replyTo if exists
        if (replyToId) {
          message = await messageModel.findById(message._id)
            .populate("replyTo")
            .exec();
        }

        const isReceiverOnline = onlineUsers.has(String(to));

        // Update status if receiver is online
        if (isReceiverOnline) {
          await messageModel.findByIdAndUpdate(message._id, {
            $set: { status: "delivered", deliveredAt: new Date() }
          });
          message.status = "delivered";
          message.deliveredAt = new Date();
          
          // Notify sender about delivery
          io.to(String(from)).emit("message-delivered", {
            messageId: message._id,
            conversationId,
            deliveredAt: message.deliveredAt
          });
        }

        // Send to receiver (if not self-message)
        if (String(from) !== String(to)) {
          io.to(String(to)).emit("msg-receive", message);
        }

        // Send confirmation to sender
        io.to(String(from)).emit("msg-sent", message);

        console.log(`📨 ${from} → ${to}: "${messageText.substring(0, 30)}..."`);
        
        // Update conversation last activity
        updateConversationActivity(conversationId);

      } catch (error) {
        console.error("send-msg error:", error);
        socket.emit("errorMessage", { 
          error: "Message send failed",
          details: error.message 
        });
      }
    });

    /* =====================================================
        5️⃣ FETCH MESSAGE HISTORY
    ===================================================== */
    socket.on("get-messages", async ({ from, to, limit = 50, skip = 0 }) => {
      try {
        if (!from || !to) {
          socket.emit("error", { message: "User IDs required" });
          return;
        }

        const conversationId = getConversationId(from, to);

        const messages = await messageModel
          .find({ conversationId })
          .notDeletedForUser(from)
          .populate("replyTo")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Reverse to get chronological order
        const chronologicalMessages = messages.reverse();

        socket.emit("messages-history", {
          messages: chronologicalMessages,
          conversationId,
          hasMore: messages.length === limit
        });

      } catch (error) {
        console.error("get-messages error:", error);
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    /* =====================================================
        6️⃣ MARK MESSAGES AS READ
    ===================================================== */
    socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
      try {
        const result = await messageModel.updateMany(
          {
            conversationId,
            receiverId: new mongoose.Types.ObjectId(readerId),
            status: { $ne: "read" },
            deletedFor: { $ne: readerId }
          },
          { 
            $set: { 
              status: "read", 
              readAt: new Date() 
            } 
          }
        );

        if (result.modifiedCount > 0) {
          io.to(String(otherUserId)).emit("message-read", {
            conversationId,
            readerId,
            count: result.modifiedCount,
            readAt: new Date()
          });

          console.log(`👁️ ${readerId} read ${result.modifiedCount} messages in ${conversationId}`);
        }
      } catch (error) {
        console.error("Read ack error:", error);
      }
    });

    /* =====================================================
        7️⃣ DISCONNECT — HANDLE USER OFFLINE
    ===================================================== */
    socket.on("disconnect", async () => {
      const userId = socket.userId;
      console.log(`🔌 Socket disconnected: ${socket.id} (user: ${userId})`);

      if (userId) {
        let userFullyOffline = false;

        if (onlineUsers.has(userId)) {
          const userSockets = onlineUsers.get(userId);
          userSockets.delete(socket.id);

          if (userSockets.size === 0) {
            onlineUsers.delete(userId);
            userFullyOffline = true;
          }
        }

        if (userFullyOffline) {
          // Update last seen in database
          try {
            await RegisterModel.findByIdAndUpdate(userId, {
              $set: { 
                onlineStatus: "offline",
                lastSeen: new Date()
              }
            });
          } catch (error) {
            console.error("Error updating last seen:", error);
          }

          // Broadcast user offline event
          io.emit("user-offline", userId);
          broadcastOnlineUsers(io);
          
          console.log(`🔴 User fully offline: ${userId}`);
        }
      }
    });

    /* =====================================================
        8️⃣ CUSTOM EVENTS FOR YOUR NEEDS
    ===================================================== */
    socket.on("user-activity", ({ userId, activity }) => {
      console.log(`📊 User ${userId} activity: ${activity}`);
      // You can log user activities or update last active time
    });

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    /* =====================================================
        9️⃣ ERROR HANDLING
    ===================================================== */
    socket.on("error", (error) => {
      console.error(`Socket error from ${socket.id}:`, error);
    });
  });

  // Server-wide events
  io.engine.on("connection_error", (err) => {
    console.error("Socket.IO connection error:", err);
  });
};

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

// Generate conversation ID
const getConversationId = (id1, id2) => {
  return [String(id1), String(id2)].sort().join("_");
};

// Broadcast online users to all connected clients
const broadcastOnlineUsers = (io) => {
  const onlineIds = Array.from(onlineUsers.keys());
  io.emit("online-users-update", onlineIds);
};

// Update conversation activity timestamp
const updateConversationActivity = async (conversationId) => {
  // This is a placeholder - you might want to implement
  // a separate Conversation model with lastActivity field
  console.log(`💬 Conversation updated: ${conversationId}`);
};

/* =====================================================
   EXPORTED FUNCTIONS FOR CONTROLLERS
===================================================== */

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

export const isUserOnline = (userId) => onlineUsers.has(String(userId));

export const getUserSocketIds = (userId) => {
  return Array.from(onlineUsers.get(String(userId)) || []);
};

export const emitToUser = (userId, event, data) => {
  if (global.io && isUserOnline(userId)) {
    global.io.to(String(userId)).emit(event, data);
    return true;
  }
  return false;
};

export const broadcastToAll = (event, data) => {
  if (global.io) {
    global.io.emit(event, data);
    return true;
  }
  return false;
};