import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  userId:{ type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true},
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
  },
  status: {
    type: String,
    enum: ['liked', 'matched'],
    default: 'liked',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const LikeModel = mongoose.model('Like', likeSchema);
