import mongoose from "mongoose";
import messageModel from "./src/modal/messageModel.js";
import RegisterModel from "./src/modal/register.js";

// Track online users (userId → Set<socketIds>)
const onlineUsers = new Map();

// Track typing users (conversationId → {userId, timeout})
const typingUsers = new Map();

// Helper function to generate conversation ID
const getConversationId = (id1, id2) => {
  return [String(id1), String(id2)].sort().join("_");
};

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    let userId = null;

    /* =====================================================
        1️⃣ USER ONLINE JOIN
    ===================================================== */
    socket.on("add-user", async (incomingUserId) => {
      if (!incomingUserId) {
        console.error("⚠️ No userId provided for add-user");
        socket.emit("error", { message: "User ID is required" });
        return;
      }

      try {
        // Store userId on socket and outer scope
        socket.userId = incomingUserId;
        userId = incomingUserId;

        // Add to online users
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Join user room
        socket.join(String(userId));

        console.log(`🟢 User online: ${userId} (socket: ${socket.id})`);
        
        // Update user status in database
        await RegisterModel.findByIdAndUpdate(userId, {
          $set: { onlineStatus: "online", lastSeen: null }
        }, { new: true }).catch(err => 
          console.error("Error updating online status:", err)
        );

        // Broadcast user online event
        socket.broadcast.emit("user-online", userId);
        
        // Send online users list to this user
        socket.emit("online-users", Array.from(onlineUsers.keys()));
        
        // Broadcast updated online users to all
        broadcastOnlineUsers(io);

        // Send confirmation
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
        2️⃣ SEND MESSAGE (TEXT/FILES)
    ===================================================== */
    socket.on("send-msg", async ({ from, to, messageText, replyToId, tempId, files }) => {
      try {
        if (!from || !to) {
          socket.emit("error", { message: "Invalid message data" });
          return;
        }

        // Allow empty text if files exist
        if (!messageText?.trim() && (!files || files.length === 0)) {
          socket.emit("error", { message: "Message text or files required" });
          return;
        }

        const conversationId = getConversationId(from, to);

        // Create message in database
        let message = await messageModel.create({
          senderId: new mongoose.Types.ObjectId(from),
          receiverId: new mongoose.Types.ObjectId(to),
          conversationId,
          messageText: messageText?.trim() || "",
          replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
          files: files || [],
          status: "sent",
          tempId,
        });

        // Populate replyTo if exists
        if (replyToId) {
          message = await messageModel.findById(message._id)
            .populate("replyTo")
            .exec();
        }

        const messageData = message.toObject();
        messageData.tempId = tempId; // Include tempId for client-side matching

        const isReceiverOnline = onlineUsers.has(String(to));

        // Update status if receiver is online
        if (isReceiverOnline) {
          await messageModel.findByIdAndUpdate(message._id, {
            $set: { status: "delivered", deliveredAt: new Date() }
          });
          messageData.status = "delivered";
          messageData.deliveredAt = new Date();
          
          // Notify sender about delivery
          io.to(String(from)).emit("message-delivered", {
            messageId: message._id,
            conversationId,
            deliveredAt: messageData.deliveredAt
          });
        }

        // Send to receiver (if not self-message)
        if (String(from) !== String(to)) {
          io.to(String(to)).emit("msg-receive", messageData);
        }

        // Send confirmation to sender
        io.to(String(from)).emit("msg-sent", messageData);

        const msgPreview = messageText?.substring(0, 30) || "[File/Media]";
        console.log(`📨 ${from} → ${to}: "${msgPreview}..." [${files?.length || 0} files]`);
        
        // Stop typing indicator
        const convId = getConversationId(from, to);
        if (typingUsers.has(convId)) {
          clearTimeout(typingUsers.get(convId).timeout);
          typingUsers.delete(convId);
        }
        io.to(String(to)).emit("user-stop-typing", { from });

      } catch (error) {
        console.error("send-msg error:", error);
        socket.emit("message-error", { 
          tempId,
          error: "Message send failed",
          details: error.message 
        });
      }
    });

    /* =====================================================
        3️⃣ TYPING INDICATOR
    ===================================================== */
    socket.on("typing", ({ from, to }) => {
      if (!from || !to) {
        console.error("⚠️ Missing from/to in typing event");
        return;
      }

      const conversationId = getConversationId(from, to);
      
      // Clear previous timeout
      if (typingUsers.has(conversationId)) {
        clearTimeout(typingUsers.get(conversationId).timeout);
      }

      // Set new timeout (3 seconds)
      const timeout = setTimeout(() => {
        typingUsers.delete(conversationId);
        io.to(String(to)).emit("user-stop-typing", { from });
      }, 3000);

      typingUsers.set(conversationId, { userId: from, timeout });
      
      // Notify receiver
      io.to(String(to)).emit("user-typing", { from });

      console.log(`⌨️ ${from} is typing to ${to}`);
    });

    socket.on("stop-typing", ({ from, to }) => {
      if (from && to) {
        const conversationId = getConversationId(from, to);
        
        if (typingUsers.has(conversationId)) {
          clearTimeout(typingUsers.get(conversationId).timeout);
          typingUsers.delete(conversationId);
        }
        
        io.to(String(to)).emit("user-stop-typing", { from });
      }
    });

    /* =====================================================
        4️⃣ FETCH MESSAGE HISTORY
    ===================================================== */
    socket.on("get-messages", async ({ from, to, limit = 50, skip = 0 }) => {
      try {
        if (!from || !to) {
          socket.emit("error", { message: "User IDs required" });
          return;
        }

        const conversationId = getConversationId(from, to);

        const messages = await messageModel
          .find({ 
            conversationId,
            deletedFor: { $ne: from }
          })
          .populate("replyTo")
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .lean();

        socket.emit("messages-history", {
          messages,
          conversationId,
          hasMore: messages.length === limit
        });

      } catch (error) {
        console.error("get-messages error:", error);
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    /* =====================================================
        5️⃣ MARK MESSAGES AS READ
    ===================================================== */
    socket.on("message-read-ack", async ({ conversationId, readerId, otherUserId }) => {
      try {
        const result = await messageModel.updateMany(
          {
            conversationId,
            receiverId: new mongoose.Types.ObjectId(readerId),
            status: { $ne: "read" },
            deletedFor: { $ne: new mongoose.Types.ObjectId(readerId) }
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
        6️⃣ BLOCK/UNBLOCK EVENTS
    ===================================================== */
    socket.on("block-user", ({ blockerId, blockedId }) => {
      io.to(String(blockedId)).emit("user-blocked", {
        blockedBy: blockerId,
        timestamp: new Date()
      });
      console.log(`🚫 ${blockerId} blocked ${blockedId}`);
    });

    socket.on("unblock-user", ({ unblockerId, unblockedId }) => {
      io.to(String(unblockedId)).emit("user-unblocked", {
        unblockedBy: unblockerId,
        timestamp: new Date()
      });
      console.log(`✅ ${unblockerId} unblocked ${unblockedId}`);
    });

    /* =====================================================
        7️⃣ DELETE MESSAGE/CHAT EVENTS
    ===================================================== */
    socket.on("delete-message", async ({ messageId, deletedBy }) => {
      try {
        const message = await messageModel.findById(messageId);
        if (message && String(message.senderId) === String(deletedBy)) {
          await messageModel.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: deletedBy }
          });

          // Notify receiver
          io.to(String(message.receiverId)).emit("message-deleted", {
            messageId,
            deletedBy,
            conversationId: message.conversationId
          });
        }
      } catch (error) {
        console.error("Delete message error:", error);
      }
    });

    socket.on("delete-chat", ({ conversationId, deletedBy, otherUserId }) => {
      io.to(String(otherUserId)).emit("chat-deleted", {
        conversationId,
        deletedBy,
        timestamp: new Date()
      });
      console.log(`🗑️ ${deletedBy} deleted chat ${conversationId}`);
    });

    /* =====================================================
        8️⃣ USER ACTIVITY (PING/PONG)
    ===================================================== */
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date() });
    });

    socket.on("user-activity", ({ userId, activity }) => {
      console.log(`📊 User ${userId} activity: ${activity}`);
    });

    /* =====================================================
        9️⃣ JOIN/LEAVE ROOM
    ===================================================== */
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    /* =====================================================
        🔟 DISCONNECT — HANDLE USER OFFLINE
    ===================================================== */
    socket.on("disconnect", async () => {
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

      // Clean up typing indicators
      for (const [conversationId, typingData] of typingUsers.entries()) {
        if (typingData.userId === userId) {
          clearTimeout(typingData.timeout);
          typingUsers.delete(conversationId);
        }
      }
    });

    /* =====================================================
        ERROR HANDLING
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

// Broadcast online users to all connected clients
const broadcastOnlineUsers = (io) => {
  const onlineIds = Array.from(onlineUsers.keys());
  io.emit("online-users-update", onlineIds);
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
  const io = global.io;
  if (io && isUserOnline(userId)) {
    io.to(String(userId)).emit(event, data);
    return true;
  }
  return false;
};

export const broadcastToAll = (event, data) => {
  const io = global.io;
  if (io) {
    io.emit(event, data);
    return true;
  }
  return false;
};