import express from 'express';
import {  createReport, getAllReports } from '../controller/reportController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';
 

const reportRouter = express.Router();

reportRouter.post(
  '/report',
  authenticateUser,
  upload.array('reportImages', 5),
  createReport
);

 
reportRouter.get('/reports', getAllReports); 

export default reportRouter;
