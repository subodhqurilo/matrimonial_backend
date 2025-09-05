import mongoose from 'mongoose';

const employedInSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('EmployedIn', employedInSchema);
