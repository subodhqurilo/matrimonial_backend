import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('State', stateSchema);
