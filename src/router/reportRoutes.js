import express from 'express';
import { createReport, getAllReports } from '../controller/reportController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const reportRouter = express.Router();

// Create Report
reportRouter.post(
  '/create',
  authenticateUser,
  upload.array('image', 5),   // <— use "image" field (standard)
  createReport
);

// Get all Reports (admin only)
reportRouter.get(
  '/list',
  authenticateUser,           // or authenticateAdmin
  getAllReports
);

export default reportRouter;
