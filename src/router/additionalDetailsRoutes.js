import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { 
  getUserById, 
  updateAdditionalDetails, 
  updateProfileImagesOnly,
  deleteProfileImage,
  uploadGalleryImages,  deleteGalleryImage,replaceGalleryImages

} from '../controller/additionalDetailsController.js';

import upload from '../middlewares/multer.js';

const additionalDetail = express.Router();

// ⭐ 0️⃣ Base Route
additionalDetail.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Additional Details API Running",
  });
});

// 1️⃣ Upload / Update Profile Image
additionalDetail.put(
  '/',
  authenticateUser,
  upload.fields([{ name: 'profileImage', maxCount: 10 }]),
  updateProfileImagesOnly
);

// 2️⃣ Delete Profile Image
additionalDetail.delete(
  '/delete-profile-image',
  authenticateUser,
  deleteProfileImage
);

// 3️⃣ Update Additional Details
additionalDetail.put('/update', authenticateUser, updateAdditionalDetails);

// 4️⃣ Get User by ID (MongoId OR vmId)
additionalDetail.get('/:userId', authenticateUser, getUserById);
additionalDetail.post(
  "/gallery",
  authenticateUser,
  upload.fields([{ name: "galleryImages", maxCount: 10 }]),
  uploadGalleryImages
);

additionalDetail.delete(
  "/gallery",
  authenticateUser,
  deleteGalleryImage
);

additionalDetail.put(
  "/gallery",
  authenticateUser,
  upload.fields([{ name: "galleryImages", maxCount: 10 }]),
  replaceGalleryImages
);

export default additionalDetail;
