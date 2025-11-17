import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'Register', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Register', required: true },
  title: { type: String, required: true },
  description: { type: String },
  image: [String],
  status: { type: String, enum: ['Pending', 'Reviewed', 'Blocked'], default: 'Pending' },
}, { timestamps: true });

const ReportModel = mongoose.model('Report', reportSchema);
export default ReportModel;
