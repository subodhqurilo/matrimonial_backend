import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema(
  {
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
      enum: ['pending', 'accepted', 'rejected', 'deleted'],
      default: 'pending',
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

// Compound index to prevent duplicate requests
accountRequestSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true });

// Optional: index for faster queries by status
accountRequestSchema.index({ receiverId: 1, status: 1 });
accountRequestSchema.index({ requesterId: 1, status: 1 });

export const AccountRequestModel = mongoose.model('AccountRequest', accountRequestSchema);
