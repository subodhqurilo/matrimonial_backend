import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Designation', designationSchema);
