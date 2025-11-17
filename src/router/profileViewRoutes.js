import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { getProfilesIViewed, getProfilesWhoViewedMe, saveProfileView } from '../controller/profileViewController.js';
 

const profileViewRouter = express.Router();

profileViewRouter.post('/save', authenticateUser, saveProfileView); 
profileViewRouter.get('/i-viewed', authenticateUser, getProfilesIViewed); 
profileViewRouter.get('/viewed-me', authenticateUser, getProfilesWhoViewedMe); 

export default profileViewRouter;