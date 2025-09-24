import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import RegisterModel from "../modal/register.js";
import admin from "../modal/adminModal.js";
import OtpModel from "../modal/OtpModel.js";
import { sendOtpToPhone } from "../utils/sendOtp.js";
import User from '../modal/User.js'; // adjust path if needed
import AdminProfile from "../modal/adminProfile.js"; // For profile operations



const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export const checkKyc = async (req, res, next) => {
  try {
    const userId = req.userId; // from JWT
    const user = await RegisterModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    let kycStatus = "pending";
    if (user.adhaarCard?.isVerified) {
      kycStatus = "approved";
    } else if (user.adminApprovel === "reject") {
      kycStatus = "reject";
    }

    if (kycStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "KYC pending. Please complete Aadhaar verification.",
        kyc: kycStatus,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "KYC check failed", error: error.message });
  }
};


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
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // check if user already exists
    const existingUser = await RegisterModel.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with this mobile" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save to OTP collection
    await OtpModel.create({ firstName, lastName, email, mobile, otp });

    // send OTP to user
    await sendOtpToPhone(mobile, otp);

        console.log(`📩 OTP for ${mobile}: ${otp}`);

    res.status(200).json({ success: true, message: "OTP sent successfully",otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "OTP request failed", error: error.message });
  }
};

// Verify OTP and Register User
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // delete OTP after verification
    await OtpModel.deleteMany({ mobile });

    const id = await generateUniqueVmId();

    // Save user to RegisterModel
    const newUser = await RegisterModel.create({
      id,
      firstName: existingOtp.firstName,
      lastName: existingOtp.lastName,
      email: existingOtp.email,
      mobile,
      isMobileVerified:true,
      

    });
let kycStatus = "pending";
    if (newUser.adhaarCard?.isVerified) {
      kycStatus = "approved";
    } else if (newUser.adminApprovel === "reject") {
      kycStatus = "reject";
    }

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      userId: newUser._id,
      vmId: newUser.id,
      kyc: kycStatus,
      
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
};

/* ------------------- Login ------------------- */

// Request OTP for login
export const requestLoginOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile is required" });

    const user = await RegisterModel.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP
    await OtpModel.create({ mobile, otp });

    // Send OTP
    await sendOtpToPhone(mobile, otp);

        console.log(`📩 Login OTP for ${mobile}: ${otp}`);

    res.status(200).json({ success: true, message: "OTP sent successfully",otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
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
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // delete OTP after verification
    await OtpModel.deleteMany({ mobile });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
let kycStatus = 'pending'; // default
if (user.adhaarCard) {
  if (user.adhaarCard.isVerified) kycStatus = 'approved';
  else if (user.adhaarCard.isRejected) kycStatus = 'reject'; // if you have a rejection flag
}
    res.status(200).json({
  success: true,
  message: 'Login successful',
  token,
  userId: user._id,
  kyc: kycStatus, // 'approved' | 'pending' | 'reject'
});
  } catch (error) {
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
};

/* ------------------- Profile Update ------------------- */
export const registerDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const profileImage = req.files?.["profileImage"]?.[0]?.path;
    const adhaarFront = req.files?.["adhaarCardFrontImage"]?.[0]?.path;
    const adhaarBack = req.files?.["adhaarCardBackImage"]?.[0]?.path;

    if (Array.isArray(req.body.maritalStatus)) {
      req.body.maritalStatus = req.body.maritalStatus[0];
    }

    // Build update object safely
    const updateData = { ...req.body };

    if (profileImage) updateData.profileImage = profileImage;
    if (adhaarFront || adhaarBack) {
      updateData.adhaarCard = {
        ...(req.body.adhaarCard || {}),
        frontImage: adhaarFront,
        backImage: adhaarBack,
      };
    }

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { $set: updateData },   // ✅ prevents overwrite
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User profile updated",
      data: updatedUser,
    });
  } catch (error) {
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

    // ✅ Required fields check
    const requiredFields = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "maritalStatus",
      "religion",
      "motherTongue",
      "country",
      "state",
      "city",
      "highestEducation",
      "employedIn",
      "annualIncome",
      "designation",
      "profileImage"
    ];

    const isProfileComplete = requiredFields.every(
      (field) => user[field] && user[field] !== ""
    );

    res.status(200).json({
      success: true,
      user,
      isProfileComplete, // ✅ new field
    });
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};



/* ------------------- Admin ------------------- */
export const adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingUser = await admin.findOne({ email });
    if (existingUser) 
      return res.status(400).json({ message: "Admin already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin (for authentication)
    const newAdmin = new admin({ name, email, password: hashedPassword });
    await newAdmin.save();

    // ✅ Automatically create AdminProfile
    const newProfile = new AdminProfile({
      fullName: name,
      phone: "",
      assignedRegion: "All",
    });
    await newProfile.save();

    res.status(201).json({ 
      user: { id: newAdmin._id, name, email },
      message: "Admin signup successful with profile created"
    });
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



export const getAdminProfile = async (req, res) => {
  try {
    // Assuming a single admin for this simple example, or you can find by ID
    const admin = await AdminProfile.findOne();
    if (!admin) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const updateBasicInfo = async (req, res) => {
  const { fullName, phone, assignedRegion } = req.body;
  try {
    const admin = await AdminProfile.findOne();
    if (!admin) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    admin.fullName = fullName || admin.fullName;
    admin.phone = phone || admin.phone;
    admin.assignedRegion = assignedRegion || admin.assignedRegion;

    await admin.save();
    res.json({ message: 'Basic info updated successfully', admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const updateProfilePhoto = async (req, res) => {
  try {
    const adminProfile = await AdminProfile.findOne();
    if (!adminProfile) {
      return res.status(404).json({ message: "Admin profile not found" });
    }

    // multer saves file path in req.file.path
    if (req.file) {
      adminProfile.profilePhotoUrl = req.file.path; // or convert to URL if using cloud storage
      await adminProfile.save();
      return res.json({ message: "Profile photo updated successfully", admin: adminProfile });
    } else {
      return res.status(400).json({ message: "No file uploaded" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const updateSecuritySettings = async (req, res) => {
  const { currentPassword, newPassword, twoFactorAuth, alertOnSuspiciousLogin } = req.body;

  try {
    // Fetch the admin profile (assuming single admin for now)
    const admin = await AdminProfile.findOne();
    if (!admin) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    // Handle password change
    if (newPassword) {
      // If a password is already set, currentPassword must be provided
      if (admin.isPasswordSet) {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Current password is required to change password' });
        }
        const isMatch = await admin.matchPassword(currentPassword);
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid current password' });
        }
      }

      // Update password and mark as set
      admin.password = newPassword;
      admin.isPasswordSet = true;
    }

    // Update other security settings if provided
    if (twoFactorAuth !== undefined) {
      admin.twoFactorAuth = twoFactorAuth;
    }

    if (alertOnSuspiciousLogin !== undefined) {
      admin.alertOnSuspiciousLogin = alertOnSuspiciousLogin;
    }

    // Save the updated admin profile
    await admin.save();

    res.json({ message: 'Security settings updated successfully', admin });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const updatePreferences = async (req, res) => {
  const { language, defaultLandingPage, theme, notifications } = req.body || {};
  try {
    const admin = await AdminProfile.findOne();
    if (!admin) return res.status(404).json({ message: 'Admin profile not found' });

    admin.language = language || admin.language;
    admin.defaultLandingPage = defaultLandingPage || admin.defaultLandingPage;
    admin.theme = theme || admin.theme;
    if (notifications !== undefined) admin.notifications = notifications;

    await admin.save();
    res.json({ message: 'Preferences updated successfully', admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
