import express from 'express';
import {
  sendLike,
  getReceivedLikes,
  getSentLikes,
  getAllUsersILiked,
  unlikeUser,
  getMatchedUsers,
  getTheyShortlisted,
  getIShortlisted,
  getAllUsers 
} from '../controller/likeController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const likeRoute = express.Router();

likeRoute.post('/send', authenticateUser, sendLike);
likeRoute.delete('/unlike', authenticateUser, unlikeUser);
likeRoute.get('/received', authenticateUser, getReceivedLikes);
likeRoute.get('/sent', authenticateUser, getSentLikes);
likeRoute.get('/home', authenticateUser, getAllUsersILiked);

likeRoute.get('/allMatches', authenticateUser, getMatchedUsers);
likeRoute.get('/profileMatch', authenticateUser, getAllUsers );

likeRoute.get('/theyShortlist', authenticateUser, getTheyShortlisted);
likeRoute.get('/iShortlist', authenticateUser, getIShortlisted);

export default likeRoute;
