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


    

// 🔥 CALL SUPPORT (ADD HERE)
isCall: {
  type: Boolean,
  default: false,
  index: true,
},

callType: {
  type: String,
  enum: ["audio", "video"],
},

callStatus: {
  type: String,
  enum: ["initiated", "ringing", "accepted", "rejected", "missed", "ended"],
},

callDuration: {
  type: Number, // seconds
},

callStartedAt: {
  type: Date,
},

callEndedAt: {
  type: Date,
},

status: {
  type: String,
  enum: ["sent", "delivered", "read"],
  default: "sent",
  index: true,
},


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

    // Optional: Add tempId for optimistic updates
    tempId: {
      type: String,
      default: null,
    },

    // Optional: Add deliveredAt and readAt timestamps
    deliveredAt: {
      type: Date,
      default: null,
    },

    readAt: {
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

// Virtual for checking if message is deleted for specific user
messageSchema.virtual("isDeletedForMe").get(function () {
  return function (userId) {
    return this.deletedFor.includes(userId) || this.deletedAt !== null;
  };
});

// Virtual for formatted time
messageSchema.virtual("formattedTime").get(function () {
  if (!this.createdAt) return "";
  
  const now = new Date();
  const msgDate = new Date(this.createdAt);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return msgDate.toLocaleDateString();
});

// Indexes for better query performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ deletedFor: 1 });
messageSchema.index({ createdAt: -1 });

// Middleware to update timestamps based on status
messageSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "delivered" && !this.deliveredAt) {
      this.deliveredAt = new Date();
    }
    if (this.status === "read" && !this.readAt) {
      this.readAt = new Date();
    }
  }
  next();
});

// Static method to get conversation between two users
messageSchema.statics.getConversation = async function (userId1, userId2, options = {}) {
  const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const conversationId = [String(userId1), String(userId2)]
    .sort()
    .join("_");
  
  return this.find({ conversationId })
    .notDeletedForUser(userId1)
    .populate("replyTo")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function (userId, senderId = null) {
  const query = {
    receiverId: userId,
    status: { $ne: "read" },
    deletedFor: { $ne: userId }
  };
  
  if (senderId) {
    query.senderId = senderId;
  }
  
  return this.countDocuments(query);
};

const messageModel = mongoose.model("Message", messageSchema);
export default messageModel;