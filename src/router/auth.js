import express from "express";
import upload from "../middlewares/multer.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  aadhaarVerification,
  adminLogin,
  adminSignup,
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
