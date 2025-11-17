import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { getUserById, updateAdditionalDetails, updateProfileImagesOnly } from '../controller/additionalDetailsController.js';
import upload from '../middlewares/multer.js';

const additionalDetail = express.Router();

// ⭐ 0️⃣ Get root route (IMPORTANT TO FIX BROWSER ERROR)
additionalDetail.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Basic Details API Running. Use PUT /api/basic-details to update profile image.",
  });
});

// 1️⃣ Update ONLY profile image
additionalDetail.put(
  '/',
  authenticateUser,
  upload.fields([{ name: 'profileImage', maxCount: 1 }]),
  updateProfileImagesOnly
);

// 2️⃣ Update all additional details (text fields)
additionalDetail.put('/update', authenticateUser, updateAdditionalDetails);

// 3️⃣ Get user by ID
additionalDetail.get('/:userId', authenticateUser, getUserById);

export default additionalDetail;
