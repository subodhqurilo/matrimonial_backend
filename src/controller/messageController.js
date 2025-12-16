import mongoose from "mongoose";
import { AccountRequestModel } from "../modal/accountRequestModel.js";
import messageModel from "../modal/messageModel.js";
import { getOnlineUserIds, isUserOnline } from "../../socket.js";
import RegisterModel from "../modal/register.js";
import cloudinary from "../utils/cloudinary.js";

const getConversationId = (id1, id2) => {
  return [String(id1), String(id2)].sort().join("_");
};

export const postMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId, messageText, replyToId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: "receiverId required" });
    }

    const receiverExists = await RegisterModel.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ success: false, message: "Receiver not found" });
    }

    const currentUser = await RegisterModel.findById(senderId).select("blockedUsers");
    const isBlocked = receiverExists.blockedUsers?.includes(senderId);
    const youBlocked = currentUser?.blockedUsers?.includes(receiverId);

    if (isBlocked || youBlocked) {
      return res.status(403).json({ success: false, message: "Cannot send message. User is blocked." });
    }

    const uploadedFiles = (req.files || []).map((file) => ({
      fileName: file.originalname,
      fileUrl: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
    }));

    if (!messageText?.trim() && uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: "Text or file required" });
    }

    const conversationId = getConversationId(senderId, receiverId);

    let message = await messageModel.create({
      senderId,
      receiverId,
      conversationId,
      messageText: messageText?.trim() || "",
      files: uploadedFiles,
      replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
      status: "sent",
    });

    message = await messageModel.findById(message._id).populate("replyTo");

    const io = req.app.get("io");
    if (io) {
      const messageData = message.toObject();
      const receiverOnline = isUserOnline(receiverId);
      
      if (receiverOnline) {
        await messageModel.findByIdAndUpdate(message._id, {
          $set: { status: "delivered", deliveredAt: new Date() }
        });
        messageData.status = "delivered";
        messageData.deliveredAt = new Date();
        
        io.to(String(senderId)).emit("message-delivered", {
          messageId: message._id,
          conversationId,
          deliveredAt: messageData.deliveredAt
        });
      }

      io.to(String(receiverId)).emit("msg-receive", messageData);
      io.to(String(senderId)).emit("msg-sent", messageData);
      
      console.log(`📨 Message sent: ${senderId} → ${receiverId} [${uploadedFiles.length} files]`);
    }

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error("postMessage error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const sendFileMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId, replyToId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "File required" });
    }

    const receiverExists = await RegisterModel.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ success: false, message: "Receiver not found" });
    }

    const currentUser = await RegisterModel.findById(senderId).select("blockedUsers");
    const isBlocked = receiverExists.blockedUsers?.includes(senderId);
    const youBlocked = currentUser?.blockedUsers?.includes(receiverId);

    if (isBlocked || youBlocked) {
      return res.status(403).json({ success: false, message: "Cannot send file. User is blocked." });
    }

    const conversationId = getConversationId(senderId, receiverId);

    const msg = await messageModel.create({
      senderId,
      receiverId,
      conversationId,
      messageText: "",
      files: [{
        fileName: file.originalname,
        fileUrl: file.path,      // ✅ ALREADY cloudinary URL
        fileType: file.mimetype,
        fileSize: file.size,
      }],
      replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
      status: "sent",
    });

    const populatedMsg = await messageModel.findById(msg._id).populate("replyTo");

    const io = req.app.get("io");
    if (io) {
      io.to(String(receiverId)).emit("msg-receive", populatedMsg);
      io.to(String(senderId)).emit("msg-sent", populatedMsg);
    }

    return res.status(200).json({ success: true, data: populatedMsg });

  } catch (error) {
    console.error("sendFileMessage error:", error);
    return res.status(500).json({ success: false, message: "Internal Error" });
  }
};


export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const currentUserId = req.query.currentUserId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!userId || !currentUserId) {
      return res.status(400).json({ success: false, message: "User IDs required" });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const conversationId = getConversationId(userId, currentUserId);

    const totalMessages = await messageModel.countDocuments({
      conversationId,
      deletedFor: { $ne: userId }
    });

    const messages = await messageModel
      .find({ conversationId, deletedFor: { $ne: userId } })
      .populate({ path: "replyTo", select: "messageText files senderId receiverId createdAt" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const otherUser = await RegisterModel.findById(currentUserId).lean();
    const currentUser = await RegisterModel.findById(userId).lean();

    const isBlocked = otherUser?.blockedUsers?.includes(userId);
    const youBlocked = currentUser?.blockedUsers?.includes(currentUserId);

    return res.status(200).json({
      success: true,
      data: messages.reverse(),
      isBlocked,
      youBlocked,
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit),
        hasMore: page * limit < totalMessages
      }
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.userId;

    const unreadCounts = await messageModel.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(String(userId)),
          status: { $ne: "read" },
          deletedFor: { $ne: new mongoose.Types.ObjectId(String(userId)) }
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
          lastMessageTime: { $max: "$createdAt" }
        },
      },
      { $sort: { lastMessageTime: -1 } }
    ]);

    res.status(200).json({ success: true, data: unreadCounts });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getOnlineStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const onlineUserIds = getOnlineUserIds();

    const me = await RegisterModel.findById(userId).select("blockedUsers");

    let finalOnlineUsers = onlineUserIds;

    if (me?.blockedUsers?.length > 0) {
      finalOnlineUsers = onlineUserIds.filter((id) => !me.blockedUsers.includes(id));
    }

    res.status(200).json({ success: true, data: finalOnlineUsers });
  } catch (error) {
    console.error("Error in getOnlineStatus:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
};

export const checkBlockStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const otherUserId = req.params.otherUserId;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId is required" });
    }

    const me = await RegisterModel.findById(userId).select("blockedUsers");
    const other = await RegisterModel.findById(otherUserId).select("blockedUsers");

    const iBlocked = me?.blockedUsers?.includes(otherUserId);
    const blockedMe = other?.blockedUsers?.includes(userId);

    return res.status(200).json({ success: true, data: { iBlocked, blockedMe } });
  } catch (error) {
    console.error("Block status error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const acceptedRequests = await AccountRequestModel.find({
      status: "accepted",
      $or: [{ requesterId: userId }, { receiverId: userId }]
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    const users = acceptedRequests
      .map(reqDoc => {
        if (!reqDoc?.requesterId || !reqDoc?.receiverId) return null;
        return String(reqDoc.requesterId._id) === String(userId)
          ? reqDoc.receiverId
          : reqDoc.requesterId;
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!userId || !otherUserId) {
      return res.status(400).json({ success: false, message: "User IDs required" });
    }

    const conversationId = getConversationId(userId, otherUserId);

    const result = await messageModel.updateMany(
      {
        conversationId,
        receiverId: userId,
        status: { $ne: "read" },
        deletedFor: { $ne: new mongoose.Types.ObjectId(String(userId)) }
      },
      { $set: { status: "read", readAt: new Date() } }
    );

    const io = req.app.get("io");
    if (io && result.modifiedCount > 0) {
      io.to(String(otherUserId)).emit("messages-read", {
        conversationId,
        readerId: userId,
        count: result.modifiedCount
      });
    }

    return res.status(200).json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllRequestsExceptMine = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const requests = await AccountRequestModel.find({
      status: "accepted",
      $or: [{ requesterId: { $ne: userId } }, { receiverId: { $ne: userId } }]
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    const otherUsers = requests
      .map((r) => {
        if (!r?.requesterId || !r?.receiverId) return null;
        const otherUser = String(r.requesterId._id) === String(userId)
          ? r.receiverId
          : r.requesterId;
        return String(otherUser._id) !== String(userId) ? otherUser : null;
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: otherUsers });
  } catch (error) {
    console.error("Error in getAllRequestsExceptMine:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getChatList = async (req, res) => {
  try {
    const userId = req.userId;
    const filter = req.query.filter || "all";

    const onlineIds = new Set(getOnlineUserIds() || []);

    const relationships = await AccountRequestModel.find({
      $or: [{ requesterId: userId }, { receiverId: userId }],
    })
      .populate("requesterId", "firstName lastName profileImage blockedUsers")
      .populate("receiverId", "firstName lastName profileImage blockedUsers");

    let finalUsers = [];

    for (const reqDoc of relationships) {
      if (!reqDoc.requesterId || !reqDoc.receiverId) continue;

      const other = String(reqDoc.requesterId._id) === String(userId)
        ? reqDoc.receiverId
        : reqDoc.requesterId;

      const otherBlocked = other.blockedUsers?.includes(userId);
      const currentUser = String(reqDoc.requesterId._id) === String(userId)
        ? reqDoc.requesterId
        : reqDoc.receiverId;
      const youBlocked = currentUser.blockedUsers?.includes(other._id);

      if (otherBlocked || youBlocked) continue;

      const otherId = String(other._id);
      const conversationId = getConversationId(userId, otherId);

      const lastMsg = await messageModel
        .findOne({ conversationId, deletedFor: { $ne: userId } })
        .sort({ createdAt: -1 });

      const unread = await messageModel.countDocuments({
        conversationId,
        receiverId: userId,
        status: { $ne: "read" },
        deletedFor: { $ne: userId }
      });

      const obj = {
        _id: otherId,
        firstName: other.firstName || "",
        lastName: other.lastName || "",
        profileImage: other.profileImage || null,
        lastMessage: lastMsg?.messageText || (lastMsg?.files?.length > 0 ? "📎 File" : ""),
        time: lastMsg?.createdAt || null,
        unread,
        online: onlineIds.has(otherId),
        status: reqDoc.status || "pending",
      };

      finalUsers.push(obj);
    }

    if (filter === "accepted") {
      finalUsers = finalUsers.filter((u) => u.status === "accepted");
    }

    if (filter === "interested") {
      finalUsers = finalUsers.filter(
        (u) => u.status !== "accepted" && u.lastMessage !== ""
      );
    }

    if (filter === "call") {
      const callKeywords = ["call", "mobile", "phone", "number"];
      finalUsers = finalUsers.filter((u) =>
        callKeywords.some((k) => u.lastMessage?.toLowerCase().includes(k))
      );
    }

    finalUsers.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    return res.status(200).json({ success: true, data: finalUsers });
  } catch (error) {
    console.error("❌ Error in getChatList:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteSingleMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ success: false, message: "Message ID required" });
    }

    const message = await messageModel.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "You can delete only your own messages" });
    }

    await messageModel.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });

    const io = req.app.get("io");
    if (io) {
      io.to(String(message.receiverId)).emit("message-deleted", {
        messageId,
        deletedBy: userId
      });
    }

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Error in deleteSingleMessage:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId required" });
    }

    const conversationId = getConversationId(userId, otherUserId);

    await messageModel.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(String(otherUserId)).emit("chat-deleted", {
        conversationId,
        deletedBy: userId
      });
    }

    res.status(200).json({ success: true, message: "Chat deleted for you" });
  } catch (error) {
    console.error("Error in deleteChat:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId is required" });
    }

    await RegisterModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: otherUserId },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(otherUserId)).emit("user-blocked", {
        blockedBy: userId,
        youAreBlocked: true
      });
    }

    return res.status(200).json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    console.error("Block Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId is required" });
    }

    await RegisterModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: otherUserId },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(otherUserId)).emit("user-unblocked", {
        unblockedBy: userId,
        youAreUnblocked: true
      });
    }

    return res.status(200).json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    console.error("Unblock Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getChatHeader = async (req, res) => {
  try {
    const { userId } = req.query;
    const currentUserId = req.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await RegisterModel.findById(userId).select(
      "firstName lastName profileImage blockedUsers lastSeen"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const onlineUsersList = getOnlineUserIds();
    const isOnline = onlineUsersList.includes(String(userId));

    const currentUser = await RegisterModel.findById(currentUserId).select("blockedUsers");
    const iBlocked = currentUser?.blockedUsers?.includes(userId);
    const blockedMe = user?.blockedUsers?.includes(currentUserId);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        profileImage: user.profileImage,
        online: isOnline,
        lastSeen: user.lastSeen,
        isBlocked: blockedMe,
        youBlocked: iBlocked
      },
    });
  } catch (error) {
    console.error("Error in getChatHeader:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { query, conversationId } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Search query required" });
    }

    let searchConditions = {
      $or: [
        { messageText: { $regex: query, $options: "i" } },
        { "files.fileName": { $regex: query, $options: "i" } }
      ],
      deletedFor: { $ne: userId }
    };

    if (conversationId) {
      searchConditions.conversationId = conversationId;
    } else {
      const userConversations = await messageModel.distinct("conversationId", {
        $or: [{ senderId: userId }, { receiverId: userId }]
      });
      searchConditions.conversationId = { $in: userConversations };
    }

    const messages = await messageModel
      .find(searchConditions)
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error in searchMessages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getConversationInfo = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId required" });
    }

    const conversationId = getConversationId(userId, otherUserId);

    const [totalMessages, unreadCount, lastMessage, firstMessage] = await Promise.all([
      messageModel.countDocuments({ conversationId, deletedFor: { $ne: userId } }),
      messageModel.countDocuments({
        conversationId,
        receiverId: userId,
        status: { $ne: "read" },
        deletedFor: { $ne: userId }
      }),
      messageModel.findOne({ conversationId, deletedFor: { $ne: userId } }).sort({ createdAt: -1 }),
      messageModel.findOne({ conversationId, deletedFor: { $ne: userId } }).sort({ createdAt: 1 })
    ]);

    const otherUser = await RegisterModel.findById(otherUserId)
      .select("firstName lastName profileImage blockedUsers onlineStatus lastSeen");

    const me = await RegisterModel.findById(userId).select("blockedUsers");
    const iBlocked = me?.blockedUsers?.includes(otherUserId);
    const blockedMe = otherUser?.blockedUsers?.includes(userId);

    const onlineUsers = getOnlineUserIds();
    const isOnline = onlineUsers.includes(String(otherUserId));

    res.status(200).json({
      success: true,
      data: {
        conversationId,
        otherUser: {
          _id: otherUser._id,
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          profileImage: otherUser.profileImage,
          online: isOnline,
          lastSeen: otherUser.lastSeen
        },
        stats: {
          totalMessages,
          unreadCount,
          lastMessageTime: lastMessage?.createdAt || null,
          firstMessageTime: firstMessage?.createdAt || null,
          hasFiles: lastMessage?.files?.length > 0
        },
        blockStatus: { iBlocked, blockedMe },
        canCommunicate: !iBlocked && !blockedMe
      }
    });
  } catch (error) {
    console.error("Error in getConversationInfo:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const clearAllUnread = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await messageModel.updateMany(
      {
        receiverId: userId,
        status: { $ne: "read" },
        deletedFor: { $ne: userId }
      },
      { $set: { status: "read", readAt: new Date() } }
    );

    const io = req.app.get("io");
    if (io && result.modifiedCount > 0) {
      const conversations = await messageModel.aggregate([
        {
          $match: {
            receiverId: new mongoose.Types.ObjectId(userId),
            status: "read",
            readAt: { $gte: new Date(Date.now() - 10000) }
          }
        },
        { $group: { _id: "$senderId" } }
      ]);

      conversations.forEach(conv => {
        io.to(String(conv._id)).emit("all-messages-read", { readerId: userId });
      });
    }

    return res.status(200).json({
      success: true,
      updated: result.modifiedCount,
      message: `Marked ${result.modifiedCount} messages as read`
    });
  } catch (error) {
    console.error("Error in clearAllUnread:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};