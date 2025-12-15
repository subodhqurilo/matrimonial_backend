import express from 'express';
import {
  getAllRequestsExceptMine,
  getMessages,
  postMessage,
  getUnreadMessagesCount,
  getOnlineStatus,
  markMessagesAsRead,
  getAllUser,  
  getChatList,
  blockUser,
  unblockUser,
  deleteChat,
  deleteSingleMessage,
  getChatHeader,
  checkBlockStatus,
  sendFileMessage,
  searchMessages,  // Added from previous enhancement
  getConversationInfo, // Optional: New endpoint
  clearAllUnread // Optional: New endpoint
} from '../controller/messageController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const messageRoutes = express.Router();

// ==================== MESSAGE CRUD ====================
messageRoutes.post('/', authenticateUser, upload.array("files"), postMessage);
messageRoutes.post(
  "/send-file",
  authenticateUser,
  upload.single("file"),
  sendFileMessage
);
messageRoutes.get('/', authenticateUser, getMessages);

// ==================== MESSAGE MANAGEMENT ====================
messageRoutes.post("/delete/message", authenticateUser, deleteSingleMessage);
messageRoutes.post("/delete/chat", authenticateUser, deleteChat);
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);
messageRoutes.post('/clearAllUnread', authenticateUser, clearAllUnread); // Optional

// ==================== USER & CHAT LIST ====================
messageRoutes.get('/allUser', authenticateUser, getAllUser);
messageRoutes.get("/chatList", authenticateUser, getChatList);
messageRoutes.get("/chatHeader", authenticateUser, getChatHeader);
messageRoutes.get('/allExceptMe', authenticateUser, getAllRequestsExceptMine);

// ==================== STATUS & METRICS ====================
messageRoutes.get('/unreadCount', authenticateUser, getUnreadMessagesCount);
messageRoutes.get('/online', authenticateUser, getOnlineStatus);
messageRoutes.get("/isBlocked/:otherUserId", authenticateUser, checkBlockStatus);

// ==================== BLOCK/UNBLOCK ====================
messageRoutes.post("/block", authenticateUser, blockUser);
messageRoutes.post("/unblock", authenticateUser, unblockUser);

// ==================== SEARCH ====================
messageRoutes.get('/search', authenticateUser, searchMessages);

// ==================== CONVERSATION INFO ====================
messageRoutes.get('/conversation/:otherUserId', authenticateUser, getConversationInfo); // Optional

export default messageRoutes;