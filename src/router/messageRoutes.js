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
} from '../controller/messageController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const messageRoutes = express.Router();

messageRoutes.post('/', authenticateUser, postMessage);
messageRoutes.get('/', authenticateUser, getMessages);
messageRoutes.get('/allUser', authenticateUser, getAllUser);
messageRoutes.get('/unreadCount', authenticateUser, getUnreadMessagesCount);
messageRoutes.get('/online', authenticateUser, getOnlineStatus);
messageRoutes.delete("/:id", authenticateUser, deleteMessage);


// 👇 New endpoint for marking messages as read
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);

export default messageRoutes;
