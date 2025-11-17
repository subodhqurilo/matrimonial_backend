import express from 'express';
import { getNewlyRegisteredUsers, getUserFormattedProfile, getUserPublicProfileById, getUsersWithProfileImage, updateProfileImagesOnly, updateUserFormattedProfile } from '../controller/profileController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const profileRouter = express.Router();

profileRouter.get('/users/:userId', getUserPublicProfileById);
profileRouter.get('/self',authenticateUser, getUserFormattedProfile);
profileRouter.put('/update-profile',authenticateUser, updateUserFormattedProfile);
profileRouter.put('/update-profile-image', authenticateUser,upload.fields([
  { name: 'profileImage', maxCount: 1 },
]), updateProfileImagesOnly);
profileRouter.get('/with-photo',authenticateUser, getUsersWithProfileImage);
profileRouter.get('/newly-user',authenticateUser, getNewlyRegisteredUsers);


export default profileRouter;