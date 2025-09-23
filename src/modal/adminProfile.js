import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminProfileSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  assignedRegion: String,
  password: String, // add if you want to change password
  isPasswordSet: { type: Boolean, default: false },
  twoFactorAuth: { type: Boolean, default: false },
  alertOnSuspiciousLogin: { type: Boolean, default: false },
  profilePhotoUrl: String,
  language: String,
  defaultLandingPage: String,
  theme: String,
  notifications: { type: Boolean, default: true },
});

// Method to compare passwords
adminProfileSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password if changed
adminProfileSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema);
export default AdminProfile;
