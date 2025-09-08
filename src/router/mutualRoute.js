import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { getMutualMatches } from '../controller/mutualController.js';
 

const mutualRouter = express.Router();

mutualRouter.get('/', authenticateUser, getMutualMatches);

export default mutualRouter;
