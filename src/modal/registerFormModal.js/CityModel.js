import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
  value: { type: String, required: true },
  state: { type: String, required: true }  // Save state name, not ID
}, { timestamps: true });

export default mongoose.model('City', citySchema);
