
import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  image: { type: String, required: true },
  quote: { type: String, required: true },
  name: { type: String, required: true },
  partnerName: { type: String, required: true },
}, { timestamps: true });

const MatchModel = mongoose.model('matches', testimonialSchema);
export default MatchModel;
