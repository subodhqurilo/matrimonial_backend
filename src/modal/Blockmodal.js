import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blockedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Register',      // Reference to your user model
      required: true,
      index: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Register',      // Reference to your user model
      required: true,
      index: true,
    },
  },
  { timestamps: true }       // Automatically add createdAt & updatedAt
);

// Prevent the same user being blocked twice by the same user
blockSchema.index({ blockedBy: 1, blockedUser: 1 }, { unique: true });

// Optional: Add a method to check if a user is blocked by another
blockSchema.statics.isBlocked = async function(userId, otherUserId) {
  return await this.exists({ blockedBy: userId, blockedUser: otherUserId });
};

export const BlockModel = mongoose.model('Block', blockSchema);
