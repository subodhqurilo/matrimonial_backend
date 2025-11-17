import mongoose from 'mongoose';

const profileViewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Register',
      required: true,
    },
    profileViewedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Register', required: true },
      viewedAt: { type: Date, default: Date.now },
    },
    profileIViewed: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Register', required: true },
      viewedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

const ProfileViewModel = mongoose.model('ProfileView', profileViewSchema);
export default ProfileViewModel;
