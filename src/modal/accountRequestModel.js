import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Register',
      required: true,  // user who sends request
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Register',
      required: true, // user who receives the request
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true } // createdAt, updatedAt auto
);

export const AccountRequestModel = mongoose.model(
  'AccountRequest',
  accountRequestSchema
);
