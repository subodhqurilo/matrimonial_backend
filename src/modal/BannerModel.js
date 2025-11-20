import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  image: { type: String, required: true },     // Cloudinary URL
  publicId: { type: String, required: true },  // For deleting from Cloudinary
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
