import mongoose from "mongoose";
import { AccountRequestModel } from "../modal/accountRequestModel.js";
import messageModel from "../modal/messageModel.js";
import RegisterModel from "../modal/register.js";
import { getOnlineUserIds } from "../../socket.js";

import { BlockModel } from "../modal/blockModel.js";


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
export const postMessage = async (req, res) => {
  try {
    const { receiverId, messageText } = req.body;
    const senderId = req.userId;

    if (!senderId || !receiverId || !messageText?.trim()) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if sender or receiver has blocked each other
    const blockExists = await BlockModel.exists({
      $or: [
        { blockedBy: senderId, blockedUser: receiverId },
        { blockedBy: receiverId, blockedUser: senderId },
      ]
    });

    if (blockExists) {
      return res.status(403).json({ success: false, message: "Message blocked due to block status" });
    }

    const conversationId = getConversationId(senderId, receiverId);

    let message = await messageModel.create({
      senderId,
      receiverId,
      conversationId,
      messageText: messageText.trim(),
      status: "sent",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(receiverId)).emit("receiveMessage", message);

      const onlineIds = new Set(getOnlineUserIds());
      if (onlineIds.has(String(receiverId))) {
        await messageModel.updateOne(
          { _id: message._id },
          { $set: { status: "delivered" } }
        );
        message = await messageModel.findById(message._id);
        io.to(String(senderId)).emit("messageDelivered", { messageId: message._id });
      }

      io.to(String(senderId)).emit("messageSent", message);
    }

    res.status(201).json({ success: true, message: "Message sent", data: message });
  } catch (error) {
    console.error("Error in postMessage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



/**
 * GET /api/message?currentUserId=<otherUserId>
 * Returns chat history via conversationId
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const otherUserId = req.query.currentUserId;

    if (!userId || !otherUserId) {
      return res.status(400).json({ success: false, message: "User IDs required" });
    }

    // Check if either user has blocked the other
    const blockExists = await BlockModel.exists({
      $or: [
        { blockedBy: userId, blockedUser: otherUserId },
        { blockedBy: otherUserId, blockedUser: userId },
      ],
    });

    if (blockExists) {
      // If blocked in either direction, hide messages
      return res.status(200).json({ success: true, data: [] });
    }

    const conversationId = getConversationId(userId, otherUserId);

    const messages = await messageModel
      .find({ conversationId })
      .notDeleted()
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



/**
 * GET /api/message/unreadCount
 */
export const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.userId;

    // Find users who blocked me
    const blockedMeDocs = await BlockModel.find({ blockedUser: userId });
    const blockedMeIds = blockedMeDocs.map(doc => doc.blockedBy.toString());

    // Find users I have blocked
    const currentUser = await RegisterModel.findById(userId);
    const blockedByMeIds = currentUser.blockedUsers.map(id => id.toString());

    const blockedIds = [...blockedByMeIds, ...blockedMeIds];

    const unreadCounts = await messageModel.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(String(userId)),
          status: { $ne: "read" },
          senderId: { $nin: blockedIds.map(id => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({ success: true, data: unreadCounts });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



/**
 * GET /api/message/online
 */
export const getOnlineStatus = async (req, res) => {
  try {
    // Current user
    const userId = req.userId;

    // All online users
    const onlineUserIds = getOnlineUserIds(); // returns array of user IDs

    // ✅ Do not filter blocked users
    // const blockedMeDocs = await BlockModel.find({ blockedUser: userId });
    // const blockedMeIds = blockedMeDocs.map(doc => doc.blockedBy.toString());
    // const currentUser = await RegisterModel.findById(userId);
    // const blockedByMeIds = currentUser.blockedUsers.map(id => id.toString());
    // const filteredOnlineUserIds = onlineUserIds.filter(
    //   id => !blockedMeIds.includes(id.toString()) && !blockedByMeIds.includes(id.toString())
    // );

    res.status(200).json({ success: true, data: onlineUserIds });
  } catch (error) {
    console.error("Error in getOnlineStatus:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
};







/**
 * DELETE /api/message/:id
 */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.userId; // sender ID
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid message ID" });

    const message = await messageModel.findById(id);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Only sender can delete
    if (message.senderId.toString() !== userId)
      return res.status(403).json({ success: false, message: "Cannot delete this message" });

    // Check block status
    const blockExists = await BlockModel.exists({
      $or: [
        { blockedBy: userId, blockedUser: message.receiverId },
        { blockedBy: message.receiverId, blockedUser: userId },
      ]
    });
    if (blockExists) {
      return res.status(403).json({ success: false, message: "Cannot delete message due to block status" });
    }

    await message.deleteOne();

    // Emit event via socket if needed
    const io = req.app.get("io");
    if (io) {
      io.to(message.receiverId.toString()).emit("messageDeleted", { messageId: id });
      io.to(userId.toString()).emit("messageDeleted", { messageId: id });
    }

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
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
    const users = [];
    for (const reqDoc of acceptedRequests) {
      if (!reqDoc?.requesterId || !reqDoc?.receiverId) continue;

      const otherUser = String(reqDoc.requesterId._id) === String(userId)
        ? reqDoc.receiverId
        : reqDoc.requesterId;

      // Check if either blocked the other
      const blocked = await BlockModel.exists({
        $or: [
          { blockedBy: userId, blockedUser: otherUser._id },
          { blockedBy: otherUser._id, blockedUser: userId }
        ]
      });
      if (!blocked) users.push(otherUser);
    }

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

    // Check if either blocked the other
    const isBlocked = await BlockModel.exists({
      $or: [
        { blockedBy: userId, blockedUser: otherUserId },
        { blockedBy: otherUserId, blockedUser: userId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Cannot mark messages as read due to block status" });
    }

    const conversationId = [String(userId), String(otherUserId)].sort().join("_");

    const result = await messageModel.updateMany(
      { conversationId, receiverId: userId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );

    res.status(200).json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/**
 * DELETE /api/message/deleteAll/:otherUserId
 */

export const deleteAllMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.params;

    if (!otherUserId)
      return res.status(400).json({ success: false, message: "Other user ID required" });

    // Check if either user blocked the other
    const isBlocked = await BlockModel.exists({
      $or: [
        { blockedBy: userId, blockedUser: otherUserId },
        { blockedBy: otherUserId, blockedUser: userId },
      ],
    });

    const conversationId = getConversationId(userId, otherUserId);

    if (isBlocked) {
      // Only remove messages for the user performing the delete
      await messageModel.updateMany(
        { conversationId, senderId: userId },
        { $set: { deletedAt: new Date() } }
      );
    } else {
      // Normal delete for all
      await messageModel.deleteMany({ conversationId });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(String(userId)).emit("allMessagesDeleted", { otherUserId });
      io.to(String(otherUserId)).emit("allMessagesDeleted", { otherUserId: userId });
    }

    res.status(200).json({ success: true, message: "All messages deleted" });
  } catch (err) {
    console.error("Error deleting all messages:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



export const getBlockStatus = async (req, res) => {
  try {
    const myId = req.userId; // use req.userId for consistency
    const { otherUserId } = req.params;

    if (!myId || !otherUserId) {
      return res.status(400).json({ success: false, message: "User IDs required" });
    }

    const iBlocked = await BlockModel.exists({ blockedBy: myId, blockedUser: otherUserId });
    const blockedMe = await BlockModel.exists({ blockedBy: otherUserId, blockedUser: myId });

    res.status(200).json({
      success: true,
      data: {
        iBlocked: !!iBlocked,
        blockedMe: !!blockedMe,
      },
    });
  } catch (error) {
    console.error("Error in getBlockStatus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};







/**
 * POST /api/user/block
 * Body: { targetUserId }
 */
export const blockUser = async (req, res) => {
  try {
    const myId = req.userId;
    const { targetUserId } = req.body;

    if (!myId || !targetUserId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const alreadyBlocked = await BlockModel.exists({ blockedBy: myId, blockedUser: targetUserId });
    if (alreadyBlocked) {
      return res.status(400).json({ success: false, message: "Already blocked" });
    }

    await BlockModel.create({ blockedBy: myId, blockedUser: targetUserId });
    console.log(`User ${myId} blocked ${targetUserId}`);

    res.status(200).json({ success: true, message: "User blocked" });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// POST /api/message/unblock


export const unblockUser = async (req, res) => {
  try {
    const myId = req.userId;
    const { targetUserId } = req.body;

    if (!myId || !targetUserId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const result = await BlockModel.deleteOne({ blockedBy: myId, blockedUser: targetUserId });

    if (result.deletedCount === 0) {
      return res.status(400).json({ success: false, message: "User not blocked or not found" });
    }

    console.log(`User ${myId} unblocked ${targetUserId}`);

    res.status(200).json({ success: true, message: "User unblocked" });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};






/**
 * GET /api/message/allUserGet
 */
export const getAllRequestsExceptMine = async (req, res) => {
  try {
    const userId = String(req.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    // Fetch accepted requests not created by this user
    const requests = await AccountRequestModel.find({
      status: "accepted",
      userId: { $ne: userId },
    })
      .populate("requesterId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage");

    // Get the other user in each request
    let otherUsers = requests
      .map((r) => {
        if (!r?.requesterId || !r?.receiverId) return null;
        return String(r.requesterId._id) === userId
          ? r.receiverId
          : r.requesterId;
      })
      .filter(Boolean);

    // Optionally exclude blocked users
    const currentUser = await RegisterModel.findById(userId);
    const blockedIds = currentUser?.blockedUsers.map(id => String(id)) || [];
    otherUsers = otherUsers.filter(u => !blockedIds.includes(String(u._id)));

    res.status(200).json({ success: true, data: otherUsers });
  } catch (error) {
    console.error("Error in getAllRequestsExceptMine:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

