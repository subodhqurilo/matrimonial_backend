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

authRoute.post("/sendPushNotification", (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Push Notification service not configured.",
  });
});

export default authRoute;
