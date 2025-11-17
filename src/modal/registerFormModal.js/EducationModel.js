import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Education', educationSchema);
