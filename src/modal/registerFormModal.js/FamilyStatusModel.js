import mongoose from 'mongoose';

const familyStatusSchema = new mongoose.Schema({
  value: { type: String, required: true }
});

export default mongoose.model('FamilyStatus', familyStatusSchema);
