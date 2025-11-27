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

    // ADD THIS 👇
deletedFor: {
  type: [mongoose.Schema.Types.ObjectId],
  default: [],
},

replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Message",
  default: null,
},

    // Optional soft delete (you can keep)
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// 👇 Only show messages not deleted for the current user AND not soft-deleted
messageSchema.query.notDeletedForUser = function (userId) {
  return this.where({
    deletedAt: null,
    deletedFor: { $ne: userId },
  });
};

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1 });

const messageModel = mongoose.model("Message", messageSchema);
export default messageModel;

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

    res.status(200).json({
      success: true,
      message: "Chat deleted for you.",
    });
  } catch (error) {
    console.error("Error in deleteChat:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
