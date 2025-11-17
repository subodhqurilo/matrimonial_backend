import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { getUserById, updateAdditionalDetails, updateProfileImagesOnly } from '../controller/additionalDetailsController.js';
import upload from '../middlewares/multer.js';

const additionalDetail = express.Router();

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
