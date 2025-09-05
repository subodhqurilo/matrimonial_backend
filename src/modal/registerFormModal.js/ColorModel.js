import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Color', colorSchema);
