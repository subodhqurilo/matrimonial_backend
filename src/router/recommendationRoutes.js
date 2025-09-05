// routes/recommendationRoutes.js
import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import { blockUserRecomadationUserNotShow, getDailyRecomadation } from '../controller/recommendationController.js';

const recommendationRoute = express.Router();

// recommendationRoute.get('/daily', authenticateUser, getDailyRecomadation);
recommendationRoute.get('/daily2', authenticateUser, blockUserRecomadationUserNotShow);
recommendationRoute.get('/daily',authenticateUser, getDailyRecomadation);
recommendationRoute.get('/search', authenticateUser, getDailyRecomadation);

export default recommendationRoute;