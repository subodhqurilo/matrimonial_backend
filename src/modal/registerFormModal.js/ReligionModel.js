import mongoose from 'mongoose';

const religionSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Religion', religionSchema);
