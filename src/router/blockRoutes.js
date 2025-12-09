import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { blockUser, getMyBlockedList,getBlockedCount, unblockUser } from '../controller/blockController.js';
 

const blockRouter = express.Router();

blockRouter.post('/user', authenticateUser, blockUser);
blockRouter.delete('/user', authenticateUser, unblockUser);
blockRouter.get('/user', authenticateUser, getMyBlockedList);
blockRouter.get('/BlockedCount', authenticateUser, getBlockedCount);

export default blockRouter;