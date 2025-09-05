import mongoose from 'mongoose';

const profileForSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('ProfileFor', profileForSchema);
