import mongoose from "mongoose";

const adminOtpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },   // 🔥 email removed, mobile added
  otp: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes
  },
});

export default mongoose.model("AdminOtp", adminOtpSchema);
