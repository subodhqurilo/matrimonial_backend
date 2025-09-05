import mongoose from 'mongoose';

const communitiesSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Communities', communitiesSchema);
