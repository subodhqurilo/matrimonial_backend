import express from 'express';
import cors from 'cors';
import authRoute from './src/router/auth.js';
import accountRouter from './src/router/accountRequestRoutes.js';
import likeRoute from './src/router/likeRoutes.js';
import recommendationRoute from './src/router/recommendationRoutes.js';
import messageRoutes from './src/router/messageRoutes.js';
import partnerRoute from './src/router/partnerPreferenceRoutes.js';
import additionalDetail from './src/router/additionalDetailsRoutes.js';
import adminRoute from './src/router/adminApi.js';
import reportRouter from './src/router/reportRoutes.js';
import materRoute from './src/router/masterDataController.js';
import matchesRoute from './src/router/matchRoutes.js';
import profileRouter from './src/router/profileRoute.js';
import blockRouter from './src/router/blockRoutes.js';
import bannerRouter from './src/router/bannerRoute.js';
import profileViewRouter from './src/router/profileViewRoutes.js';
import mutualRouter from './src/modal/mutualModal.js';
import similarRouter from './src/router/similarProfileRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/auth',authRoute)
app.use('/api/request',accountRouter)
app.use('/api/like',likeRoute)
app.use('/api/recommendation', recommendationRoute);
app.use('/api/message', messageRoutes);
app.use('/api/partner',partnerRoute)
app.use('/api/basic-details',additionalDetail)
app.use('/api/user',reportRouter)
app.use('/api/master',materRoute)
app.use('/api/match',matchesRoute)
app.use('/api/profile',profileRouter)
app.use('/api/profile/view',profileViewRouter)
app.use('/api/cross',blockRouter)
app.use('/api/similar',similarRouter)
app.use('/api/banners',bannerRouter)
app.use('/api/mutual-matches',mutualRouter)
app.use('/admin',adminRoute)




export default app; 
