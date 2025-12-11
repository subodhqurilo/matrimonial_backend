import mongoose from "mongoose";
import { AccountRequestModel } from "../modal/accountRequestModel.js";
import messageModel from "../modal/messageModel.js";

import { getOnlineUserIds } from "../../socket.js";
import RegisterModel from "../modal/register.js";
import cloudinary from "../utils/cloudinary.js";


/**
 * Utility: generate a consistent conversationId
 */
const getConversationId = (id1, id2) => {
  return [String(id1), String(id2)].sort().join("_");
};

/**
 * POST /api/message
 * Body: { receiverId, messageText }
 * Needs authenticateUser to set req.userId
 */
// export const postMessage = async (req, res) => {
//   try {
//     const { receiverId, messageText, replyToId } = req.body;
//     const senderId = req.userId;

//     if (!senderId || !receiverId) {
//       return res.status(400).json({ success: false, message: "receiverId required" });
//     }

//     const uploadedFiles = (req.files || []).map((file) => ({
//       fileName: file.originalname,
//       fileUrl: file.path,  
//       fileType: file.mimetype,
//       fileSize: file.size,
//     }));

//     if (!messageText?.trim() && uploadedFiles.length === 0) {
//       return res.status(400).json({ success: false, message: "Text or file required" });
//     }

//     const conversationId = getConversationId(senderId, receiverId);

//     // ⭐ Create message
//     let message = await messageModel.create({
//       senderId,
//       receiverId,
//       conversationId,
//       messageText: messageText?.trim() || "",
//       files: uploadedFiles,
//       replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,

//       status: "sent",
//     });

//     // ⭐ Populate replyTo message
//     if (message.replyTo) {
//       message = await message.populate("replyTo");
//     }

//     // ⭐ Emit to socket
//     const io = req.app.get("io");
//     if (io) {
//       io.to(String(receiverId)).emit("msg-receive", message);
//       io.to(String(senderId)).emit("msg-sent", message);
//     }

//     res.status(201).json({
//       success: true,
//       message: "Message sent",
//       data: message,
//     });

//   } catch (error) {
//     console.error("Error in postMessage:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };


export const postMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId, messageText, replyToId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: "receiverId required" });
    }

    // FILES uploaded via multer + cloudinary
    const uploadedFiles = (req.files || []).map((file) => ({
      fileName: file.originalname,
      fileUrl: file.path,        // Cloudinary URL
      fileType: file.mimetype,
      fileSize: file.size,
    }));

    if (!messageText?.trim() && uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: "Text or file required" });
    }

    const conversationId = [String(senderId), String(receiverId)].sort().join("_");

    let message = await messageModel.create({
      senderId,
      receiverId,
      conversationId,
      messageText: messageText || "",
      files: uploadedFiles,
      replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
      status: "sent",
    });

    // Populate replyTo
    message = await messageModel
      .findById(message._id)
      .populate("replyTo");

    const io = req.app.get("io");

    if (io) {
      // 🔥 Send to receiver
      io.to(String(receiverId)).emit("msg-receive", message);

      // 🔥 Send confirmation to sender
      io.to(String(senderId)).emit("msg-sent", message);
    }

    return res.status(201).json({ success: true, data: message });

  } catch (error) {
    console.error("postMessage error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




/**
 * GET /api/message?currentUserId=<otherUserId>
 * Returns chat history via conversationId
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;                    // YOU
    const currentUserId = req.query.currentUserId; // OTHER USER

    if (!userId || !currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: "User IDs required" });
    }

    const conversationId = getConversationId(userId, currentUserId);

    // ⭐ 1. Fetch messages (excluding deleted ones)
    const messages = await messageModel
      .find({ conversationId })
      .notDeletedForUser(userId)
      .sort({ createdAt: 1 });

    // ⭐ 2. Check BLOCK status
    const otherUser = await RegisterModel.findById(currentUserId);
    const currentUser = await RegisterModel.findById(userId);

    // If OTHER USER blocked YOU → YOU cannot send message
    const isBlocked = otherUser?.blockedUsers?.includes(userId);

    // If YOU blocked OTHER USER → good for UI
    const youBlocked = currentUser?.blockedUsers?.includes(currentUserId);

    return res.status(200).json({
      success: true,
      data: messages,
      isBlocked,     // 👈 front-end can disable input
      youBlocked     // 👈 front-end can show "you blocked this user"
    });

  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


/**
 * GET /api/message/unreadCount
 */
export const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.userId;

    const unreadCounts = await messageModel.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(String(userId)),
          status: { $ne: "read" },

          // 👇 ignore deleted messages for this user
          deletedFor: { $ne: new mongoose.Types.ObjectId(String(userId)) }
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: unreadCounts
    });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/**
 * GET /api/message/online
 */
export const getOnlineStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const onlineUserIds = getOnlineUserIds(); // All online users

    // Fetch current user (to check their blocked list)
    const me = await RegisterModel.findById(userId).select("blockedUsers");

    let finalOnlineUsers = onlineUserIds;

    // ❌ Remove users that YOU blocked
    if (me?.blockedUsers?.length > 0) {
      finalOnlineUsers = onlineUserIds.filter(
        (id) => !me.blockedUsers.includes(id)
      );
    }

    res.status(200).json({
      success: true,
      data: finalOnlineUsers,
    });

  } catch (error) {
    console.error("Error in getOnlineStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal error",
    });
  }
};

export const checkBlockStatus = async (req, res) => {
  try {
    const userId = req.userId;          // logged in user
    const otherUserId = req.params.otherUserId;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "otherUserId is required",
      });
    }

    const me = await RegisterModel.findById(userId).select("blockedUsers");
    const other = await RegisterModel.findById(otherUserId).select("blockedUsers");

    const iBlocked = me?.blockedUsers?.includes(otherUserId);     // YOU blocked them
    const blockedMe = other?.blockedUsers?.includes(userId);      // THEY blocked you

    return res.status(200).json({
      success: true,
      data: { iBlocked, blockedMe },
    });

  } catch (error) {
    console.error("Block status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



export const getAllUser = async (req, res) => {
  try {
    const userId = req.userId; // set by authenticateUser middleware
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    // Find accepted requests involving this user
    const acceptedRequests = await AccountRequestModel.find({
      status: "accepted",
      $or: [
        { requesterId: userId },
        { receiverId: userId }
      ]
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    // Extract only the "other" user from each request
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
      return res.status(400).json({
        success: false,
        message: "User IDs required"
      });
    }

    const conversationId = [String(userId), String(otherUserId)]
      .sort()
      .join("_");

    const result = await messageModel.updateMany(
      {
        conversationId,
        receiverId: userId,
        status: { $ne: "read" },

        // 🚫 Don’t update deleted messages
        deletedFor: { $ne: new mongoose.Types.ObjectId(String(userId)) }
      },
      {
        $set: { status: "read" }
      }
    );

    return res.status(200).json({
      success: true,
      updated: result.modifiedCount
    });

  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



/**
 * GET /api/message/allUserGet
 */
export const getAllRequestsExceptMine = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });
    }

    const requests = await AccountRequestModel.find({
      status: "accepted",
      userId: { $ne: userId },
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    const otherUsers = requests
      .map((r) => {
        if (!r?.requesterId || !r?.receiverId) return null;
        return String(r.requesterId._id) === String(userId)
          ? r.receiverId
          : r.requesterId;
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: otherUsers });
  } catch (error) {
    console.error("Error in getAllRequestsExceptMine:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const getChatList = async (req, res) => {
  try {
    const userId = req.userId;
    const filter = req.query.filter || "all";

    const onlineIds = new Set(getOnlineUserIds() || []);

    // 1️⃣ Fetch accepted/pending relationships
    const accepted = await AccountRequestModel.find({
      $or: [{ requesterId: userId }, { receiverId: userId }],
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    let finalUsers = [];

    for (const reqDoc of accepted) {
      // Skip deleted users
      if (!reqDoc.requesterId || !reqDoc.receiverId) continue;

      const other =
        String(reqDoc.requesterId._id) === String(userId)
          ? reqDoc.receiverId
          : reqDoc.requesterId;

      const otherId = String(other._id);
      const conversationId = [userId, otherId].sort().join("_");

      // 🟦 Last message
      const lastMsg = await messageModel
        .findOne({ conversationId })
        .sort({ createdAt: -1 });

      // 🟦 unread count
      const unread = await messageModel.countDocuments({
        conversationId,
        receiverId: userId,
        status: { $ne: "read" },
      });

      const obj = {
        _id: otherId,
        firstName: other.firstName || "",
        lastName: other.lastName || "",
        profileImage: other.profileImage || null,

        lastMessage: lastMsg?.messageText || "",
        time: lastMsg?.createdAt || null,
        unread,
        online: onlineIds.has(otherId),
        status: reqDoc.status || "pending",
      };

      finalUsers.push(obj);
    }

    // 2️⃣ FILTERING 
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
        callKeywords.some((k) =>
          u.lastMessage?.toLowerCase().includes(k)
        )
      );
    }

    // 3️⃣ Sorting
    finalUsers.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.status(200).json({
      success: true,
      data: finalUsers,
    });
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
      return res.status(400).json({
        success: false,
        message: "Message ID required",
      });
    }

    const message = await messageModel.findById(messageId);

    if (!message)
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });

    // Only sender can delete own sent message
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own messages",
      });
    }

    // Soft delete using deletedFor
    await messageModel.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId },
    });

    res.status(200).json({
      success: true,
      message: "Message deleted",
    });
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
      return res.status(400).json({
        success: false,
        message: "otherUserId required",
      });
    }

    const conversationId = [String(userId), String(otherUserId)]
      .sort()
      .join("_");

    await messageModel.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({
      success: true,
      message: "Chat deleted for you",
    });
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
      return res.status(400).json({
        success: false,
        message: "otherUserId is required",
      });
    }

    await RegisterModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: otherUserId },
    });

    // 🔥 SOCKET EVENT SEND
    const io = req.app.get("io");
    if (io) {
      io.to(String(otherUserId)).emit("user-blocked", {
        blockedBy: userId,
        youAreBlocked: true
      });
    }

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
    });
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
      return res.status(400).json({
        success: false,
        message: "otherUserId is required",
      });
    }

    await RegisterModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: otherUserId },
    });

    // 🔥 SOCKET EVENT SEND
    const io = req.app.get("io");
    if (io) {
      io.to(String(otherUserId)).emit("user-unblocked", {
        unblockedBy: userId,
        youAreUnblocked: true
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error) {
    console.error("Unblock Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 📌 GET CHAT HEADER INFO
// GET /api/message/chatHeader?userId=<otherUserId>
export const getChatHeader = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Fetch user basic details
    const user = await RegisterModel.findById(userId).select(
      "firstName lastName profileImage blockedUsers"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Online status
    const onlineUsers = new Set(getOnlineUserIds());
    const isOnline = onlineUsers.has(String(userId));

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        profileImage: user.profileImage,
        online: isOnline,
      },
    });
  } catch (error) {
    console.error("Error in getChatHeader:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
