import mongoose from 'mongoose';

const maritalStatusSchema = new mongoose.Schema({
  value: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('MaritalStatus', maritalStatusSchema);
