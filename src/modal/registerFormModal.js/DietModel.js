import mongoose from 'mongoose';

const dietSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Diet', dietSchema);
