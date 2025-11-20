import express from 'express';
import {
  createReport,
  getAllReportsAnalize,
  getSingleReport 
} from '../controller/reportController.js';

import { authenticateUser } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const reportRouter = express.Router();

reportRouter.post(
  '/create',
  authenticateUser,
  upload.array('image', 5),
  createReport
);

reportRouter.get(
  '/list',
  authenticateUser,
  getAllReportsAnalize
);
reportRouter.get(
  '/view/:id',
  authenticateUser,   // or remove if you want public view
  getSingleReport
);


export default reportRouter;
