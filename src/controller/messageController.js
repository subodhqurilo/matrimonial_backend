import mongoose from "mongoose";
import { AccountRequestModel } from "../modal/accountRequestModel.js";
import messageModel from "../modal/messageModel.js";
import RegisterModel from "../modal/register.js";
import { getOnlineUserIds } from "../../socket.js";

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
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const conversationId = getConversationId(senderId, receiverId);

    // 1) save
    let message = await messageModel.create({
      senderId,
      receiverId,
      conversationId,
      messageText: messageText.trim(),
      status: "sent",
    });

    // 2) if receiver online, mark delivered + emit via sockets
    const io = req.app.get("io");
    if (io) {
      io.to(String(receiverId)).emit("receiveMessage", message);

      const onlineIds = new Set(getOnlineUserIds());
      if (onlineIds.has(String(receiverId))) {
        await messageModel.updateOne(
          { _id: message._id },
          { $set: { status: "delivered" } }
        );
        message = await messageModel.findById(message._id); // refresh
        io.to(String(senderId)).emit("messageDelivered", { messageId: message._id });
      }

      io.to(String(senderId)).emit("messageSent", message);
    }

    res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    console.error("Error in postMessage:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/message?currentUserId=<otherUserId>
 * Returns chat history via conversationId
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const currentUserId = req.query.currentUserId;

    if (!userId || !currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: "User IDs required" });
    }

    const conversationId = getConversationId(userId, currentUserId);

    const messages = await messageModel
      .find({ conversationId })
      .notDeleted()
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
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
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/message/online
 */
export const getOnlineStatus = async (req, res) => {
  try {
    const onlineUserIds = getOnlineUserIds();
    res.status(200).json({ success: true, data: onlineUserIds });
  } catch (error) {
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
