import mongoose from 'mongoose';

const casteSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Caste', casteSchema);
