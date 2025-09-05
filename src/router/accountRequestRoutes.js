import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import {
  getReceivedRequests,
  getReceivedRequestsByStatus,
  getRejectedRequests,
  getRequestsAcceptedByMe,
  getRequestsAcceptedByOthers,
  getSentRequests,
  requestAccount,
  updateAccountRequestStatus,
  deleteAccountRequest, // <-- we need to create this in controller
} from '../controller/accountRequestController.js';

const accountRouter = express.Router();

accountRouter.delete('/delete', authenticateUser, deleteAccountRequest);
accountRouter.post('/send', authenticateUser, requestAccount);
accountRouter.patch('/update-status', authenticateUser, updateAccountRequestStatus);

accountRouter.get('/received', authenticateUser, getReceivedRequests);
accountRouter.get('/receivedData', authenticateUser, getReceivedRequestsByStatus);
accountRouter.get('/getSendRequest', authenticateUser, getSentRequests);
accountRouter.get('/accepted-by-me', authenticateUser, getRequestsAcceptedByMe);
accountRouter.get('/accepted-by-others', authenticateUser, getRequestsAcceptedByOthers);
accountRouter.get('/deleteGet', authenticateUser, getRejectedRequests);

// ✅ Add DELETE route for frontend

export default accountRouter;
