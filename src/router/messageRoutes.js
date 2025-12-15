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
  checkBlockStatus ,
  sendFileMessage

} from '../controller/messageController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js'; // OK



const messageRoutes = express.Router();

messageRoutes.post('/', authenticateUser, upload.array("files"), postMessage);
messageRoutes.post(
  "/send-file",
  authenticateUser,
  upload.single("file"),
  sendFileMessage
);


messageRoutes.get('/', authenticateUser, getMessages);
messageRoutes.get('/allUser', authenticateUser, getAllUser);
messageRoutes.get('/unreadCount', authenticateUser, getUnreadMessagesCount);
messageRoutes.get('/online', authenticateUser, getOnlineStatus);

// 👇 New endpoint for marking messages as read
messageRoutes.patch('/markAsRead', authenticateUser, markMessagesAsRead);
messageRoutes.get("/chatList", authenticateUser, getChatList);
// Block / Unblock user
messageRoutes.post("/block", authenticateUser, blockUser);
messageRoutes.post("/unblock", authenticateUser, unblockUser);

// Chat delete
messageRoutes.post("/delete/chat", authenticateUser, deleteChat);

// Single message delete (optional)
messageRoutes.post("/delete/message", authenticateUser, deleteSingleMessage);
messageRoutes.get("/chatHeader", authenticateUser, getChatHeader);
messageRoutes.get("/isBlocked/:otherUserId", authenticateUser, checkBlockStatus);

export default messageRoutes;
