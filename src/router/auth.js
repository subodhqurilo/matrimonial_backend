import express from "express";
import upload from "../middlewares/multer.js";
import admin from "firebase-admin";

import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  aadhaarVerification,
  adminLogin,
  adminSignup,
  getAdminProfile,
  updateBasicInfo,
  updateProfilePhoto,
  updateSecuritySettings,
  updatePreferences,
  login,
  registerDetails,
  requestOtp,
  requestLoginOtp,
  getCurrentUser,
  verifyOtpAndRegister, // OTP-based registration
} from "../controller/authController.js";

const authRoute = express.Router();

/* ------------------- OTP Registration ------------------- */

// Request OTP
authRoute.post("/otp-request", requestOtp);

// Verify OTP and complete registration
authRoute.post("/verify-otp-register", verifyOtpAndRegister);

/* ------------------- User Profile ------------------- */
authRoute.post(
  "/profile",
  authenticateUser,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "adhaarCardFrontImage", maxCount: 1 },
    { name: "adhaarCardBackImage", maxCount: 1 },
  ]),
  registerDetails
);

/* ------------------- Login ------------------- */
authRoute.post("/otp-login-request", requestLoginOtp);

authRoute.post("/login", login);

/* ------------------- Admin Routes ------------------- */
authRoute.post("/admin/signup", adminSignup);
authRoute.post("/admin/login", adminLogin);

/* ------------------- Aadhaar Verification ------------------- */
authRoute.get("/aadhaar-status", authenticateUser, aadhaarVerification);
// Get current user
authRoute.get("/user", authenticateUser, getCurrentUser);



authRoute.get("/admin/profile", getAdminProfile);

// Update basic info (fullName, phone, assignedRegion)
authRoute.put("/admin/profile/basic", updateBasicInfo);

// Update profile photo
authRoute.put(
  "/admin/profile/photo",
  authenticateUser,
  upload.single("profilePhoto"), // <--- form-data key: profilePhoto
  updateProfilePhoto
);


// Update security settings (password, 2FA, alerts)
authRoute.put("/admin/profile/security", updateSecuritySettings);

// Update preferences (language, theme, landing page, notifications)
authRoute.put("/admin/profile/preferences", updatePreferences);

/* ------------------- Push Notification ------------------- */
authRoute.post("/sendPushNotification", async (req, res) => {
  try {
    const receivedToken = req.body.fcmToken;
    console.log("Received FCM Token:", receivedToken);

    if (!receivedToken) {
      return res.status(400).json({ error: "FCM token is required" });
    }

    const message = {
      notification: {
        title: "Test Notification",
        body: "This is a test notification from the server.",
      },
      token: receivedToken,
    };

    // ✅ Send the notification
    const response = await admin.messaging().send(message);

    console.log("Successfully sent message:", response);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default authRoute;
