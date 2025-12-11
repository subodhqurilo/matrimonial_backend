import mongoose from "mongoose";

const messageFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Register",
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Register",
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },

    messageText: {
      type: String,
      trim: true,
      default: "",
    },

    files: [messageFileSchema],

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hide messages deleted for user
messageSchema.query.notDeletedForUser = function (userId) {
  return this.where({
    deletedAt: null,
    deletedFor: { $ne: userId },
  });
};

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const messageModel = mongoose.model("Message", messageSchema);
export default messageModel;


/* ============================
   DELETE CHAT for One User
============================ */
export const deleteChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    const conversationId = [String(userId), String(otherUserId)]
      .sort()
      .join("_");

    await messageModel.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    return res.status(200).json({
      success: true,
      message: "Chat deleted for you.",
    });

  } catch (error) {
    console.error("Delete chat error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
