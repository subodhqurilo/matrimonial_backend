import mongoose from 'mongoose';

const motherTongueSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('MotherTongue', motherTongueSchema);
