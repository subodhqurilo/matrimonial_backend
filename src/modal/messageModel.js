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
      default: "", // ✅ allow empty if only files are sent
    },
    files: [messageFileSchema], // ✅ support multiple file uploads
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true, // fast lookup for unread
    },
    deletedAt: {
      type: Date,
      default: null, // null → active, not deleted
    },
  },
  { timestamps: true }
);

// ✅ Query helper to auto-exclude soft-deleted
messageSchema.query.notDeleted = function () {
  return this.where({ deletedAt: null });
};

// ✅ Indexes for faster queries
messageSchema.index({ conversationId: 1, createdAt: -1 }); // get chat history fast
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1 }); // unread lookup

const messageModel = mongoose.model("Message", messageSchema);
export default messageModel;
