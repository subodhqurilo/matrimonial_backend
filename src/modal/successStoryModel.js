import mongoose from 'mongoose';

const successStorySchema = new mongoose.Schema({
  groomName: { type: String, required: true },
  brideName: { type: String, required: true },
  storyText: { type: String, required: true },
  imageUrls: [{ type: String }],
}, {
  timestamps: true
});

export const SuccessStoryModel = mongoose.model('SuccessStory', successStorySchema);
