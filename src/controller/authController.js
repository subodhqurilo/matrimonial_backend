import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import RegisterModel from "../modal/register.js";
import admin from "../modal/adminModal.js";
import OtpModel from "../modal/OtpModel.js";
import { sendOtpToPhone } from "../utils/sendOtp.js";
import User from "../modal/User.js"; // adjust path if needed
import cloudinary from "cloudinary";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

/* ------------------- Helper ------------------- */
const generateUniqueVmId = async () => {
  let isUnique = false;
  let id;
  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    id = `vm${randomNum}`;
    const existing = await RegisterModel.findOne({ id });
    if (!existing) isUnique = true;
  }
  return id;
};

/* ------------------- Registration ------------------- */




// Request OTP for new registration
export const requestOtp = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile } = req.body;

    if (!firstName || !lastName || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✔ Check if already registered
    const existingUser = await RegisterModel.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this mobile",
      });
    }

    // ✔ Email duplicate check (IMPORTANT)
    if (email) {
      const emailExists = await RegisterModel.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // ✔ Clear old OTP entry for this mobile
    await OtpModel.deleteMany({ mobile });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await OtpModel.create({
      firstName,
      lastName,
      email,
      mobile,
      otp,
    });

    await sendOtpToPhone(mobile, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent",
      otp,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "OTP request failed",
      error: error.message,
    });
  }
};



// Verify OTP and Register User
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile and OTP are required",
      });
    }

    // Fetch latest OTP record
    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Clear OTP after successful verification
    await OtpModel.deleteMany({ mobile });

    // Check if user already created
    const existingUser = await RegisterModel.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this mobile",
      });
    }

    // Create unique vmID
    const id = await generateUniqueVmId();

    // Create user
    const newUser = await RegisterModel.create({
      id,
      firstName: existingOtp.firstName,
      lastName: existingOtp.lastName,
      email: existingOtp.email,
      mobile,
      isMobileVerified: true,
      adminApprovel: "pending",
      status: false,
    });

    const token = jwt.sign(
      { userId: newUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      userId: newUser._id,
      vmId: newUser.id,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};



/* ------------------- Login ------------------- */

// Request OTP for login
export const requestLoginOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile is required"
      });
    }

    // Check user exists
    const user = await RegisterModel.findOne({ mobile });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete old OTP for this number
    await OtpModel.deleteMany({ mobile });

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP
    await OtpModel.create({ mobile, otp });

    // Send OTP to mobile
    await sendOtpToPhone(mobile, otp);

    // ⭐ Print OTP in Terminal
    console.log(`📩 Login OTP for ${mobile}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp, // ⭐ OTP also in API response
    });

  } catch (error) {
    console.error("Login OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message
    });
  }
};



// Verify OTP & Login
export const login = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const user = await RegisterModel.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    await OtpModel.deleteMany({ mobile });

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ⭐ CORRECT ADMIN–BASED KYC CHECK
    let kycStatus = "pending";

    if (user.adminApprovel === "approved") {
      kycStatus = "approved";
    } else if (user.adminApprovel === "reject") {
      kycStatus = "reject";
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      userId: user._id,
      kyc: kycStatus,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};



/* ------------------- Profile Update ------------------- */
export const registerDetails = async (req, res) => {
  try {
    const userId = req.userId;

    const profileImage = req.files?.profileImage?.[0]?.path;
    const adhaarFront = req.files?.adhaarCardFrontImage?.[0]?.path;
    const adhaarBack = req.files?.adhaarCardBackImage?.[0]?.path;

    // Fix: React Native sometimes sends ["Unmarried"]
    if (Array.isArray(req.body.maritalStatus)) {
      req.body.maritalStatus = req.body.maritalStatus[0];
    }

    // Fetch old user data so we don’t wipe old images
    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updateData = {
      ...req.body,
    };

    // Keep old profile image if new one not uploaded
    updateData.profileImage = profileImage || user.profileImage;

    // Keep old Aadhar if not uploaded
    updateData.adhaarCard = {
      frontImage: adhaarFront || user.adhaarCard?.frontImage || null,
      backImage: adhaarBack || user.adhaarCard?.backImage || null,
    };

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("RegisterDetails Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




// Get current logged-in user

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // set by authenticateUser middleware
    if (!userId) {
      return res.status(401).json({ success: false, error: "User not authenticated" });
    }

    // Fetch user from RegisterModel
    const user = await RegisterModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};


/* ------------------- Admin ------------------- */
export const adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await admin.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new admin({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ user: { id: newUser._id, name, email } });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await admin.findOne({ email });
    if (!user) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

const token = jwt.sign({ userId: user._id }, JWT_SECRET);


    res.status(200).json({ status: "success", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

/* ------------------- Aadhaar Verification ------------------- */
export const aadhaarVerification = async (req, res) => {
  try {
    const user = await RegisterModel.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      isVerified: user.adhaarCard?.isVerified || false,
      hasAdhaarImages: !!(user.adhaarCard?.frontImage && user.adhaarCard?.backImage),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
