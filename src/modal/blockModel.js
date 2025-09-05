import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  blockedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
    index: true,
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Prevent duplicate blocks
blockSchema.index({ blockedBy: 1, blockedUser: 1 }, { unique: true });

export const BlockModel = mongoose.model('Block', blockSchema);
