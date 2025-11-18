import express from 'express';
import {
  getAllRequestsExceptMine,
  getMessages,
  postMessage,
  getUnreadMessagesCount,
  getOnlineStatus,
  markMessagesAsRead,
  getAllUser,  
  getChatList // 👈 new
} from '../controller/messageController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const messageRoutes = express.Router();

messageRoutes.post('/', authenticateUser, postMessage);
messageRoutes.get('/', authenticateUser, getMessages);
messageRoutes.get('/allUser', authenticateUser, getAllUser);
messageRoutes.get('/unreadCount', authenticateUser, getUnreadMessagesCount);
messageRoutes.get('/online', authenticateUser, getOnlineStatus);

// 👇 New endpoint for marking messages as read
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);
messageRoutes.get("/chatList", authenticateUser, getChatList);

export default messageRoutes;
