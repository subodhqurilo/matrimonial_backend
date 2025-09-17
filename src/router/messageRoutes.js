import express from 'express';
import {
  getAllRequestsExceptMine,
  getMessages,
  postMessage,
  getUnreadMessagesCount,
  deleteMessage,
  getOnlineStatus,
  markMessagesAsRead,
  getAllUser,   // 👈 new
  blockUser,          // 👈 new
  unblockUser,        // 👈 new
  deleteAllMessages,
} from '../controller/messageController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const messageRoutes = express.Router();

messageRoutes.post('/', authenticateUser, postMessage);
messageRoutes.get('/', authenticateUser, getMessages);
messageRoutes.get('/allUser', authenticateUser, getAllUser);
messageRoutes.get('/unreadCount', authenticateUser, getUnreadMessagesCount);
messageRoutes.get('/online', authenticateUser, getOnlineStatus);
messageRoutes.delete("/:id", authenticateUser, deleteMessage);
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);
messageRoutes.post('/block', authenticateUser, blockUser);
messageRoutes.post('/unblock', authenticateUser, unblockUser);
messageRoutes.delete('/deleteAll/:otherUserId', authenticateUser, deleteAllMessages);
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);

export default messageRoutes;
