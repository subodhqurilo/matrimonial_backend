import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { getUserById, updateAdditionalDetails, updateProfileImagesOnly } from '../controller/additionalDetailsController.js';
import upload from '../middlewares/multer.js';

const additionalDetail = express.Router();

additionalDetail.put('/update', authenticateUser, updateAdditionalDetails);

additionalDetail.get('/:userId', authenticateUser, getUserById);
additionalDetail.put('/', authenticateUser,upload.fields([
  { name: 'profileImage', maxCount: 1 },
]), updateProfileImagesOnly);

export default additionalDetail;
