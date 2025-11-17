import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
