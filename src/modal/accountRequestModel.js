import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema({
  userId:{
     type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
  },
  requesterId: {
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
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const AccountRequestModel = mongoose.model('AccountRequest', accountRequestSchema);
