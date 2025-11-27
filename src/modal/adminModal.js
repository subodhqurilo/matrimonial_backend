import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    phone: { type: String, default: "" },

    // Admin Roles: Super Admin / Admin / Sub Admin
    role: { type: String, default: "Admin" },

    profileImage: { type: String, default: "" },

    assignedRegion: { type: String, default: "All India" },

    /* -------------------------
          SECURITY SETTINGS
    -------------------------- */
    twoFactor: { type: Boolean, default: false },

    suspiciousLoginAlert: { type: Boolean, default: false },

    recentLoginDevice: { type: String, default: "Desktop" },

    /* -------------------------
          PREFERENCES
    -------------------------- */
    language: { type: String, default: "English" },

    theme: { type: String, default: "light" }, // light, dark, system

    notifications: { type: Boolean, default: true },

    landingPage: { type: String, default: "Dashboard" },
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
