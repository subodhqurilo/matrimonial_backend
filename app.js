import express from 'express';
import cors from 'cors';
import RegisterModel from "./src/modal/register.js";
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
import router from "./src/router/notificationRoutes.js";

const app = express();

// Only change: Added credentials to CORS
app.use(cors({
  origin: process.env.CLIENT_URLS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://matro-br.vercel.app',
    'https://matrimonial-backend-7ahc.onrender.com',
    'https://matro-main-ev8s.vercel.app',
    'https://matro-main4444-bgn8.vercel.app',
    'https://matro-main4444-4wza.vercel.app',
    'https://matrimonial-lq33.vercel.app',
    'https://matro-main4444-oypd.vercel.app'

  ],
  credentials: true, // Only this line added
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routes exactly as before
app.use('/auth', authRoute);
app.use('/api/basic-details', additionalDetail);
app.use('/api/notification', router);
app.use('/api/request', accountRouter);
app.use('/api/like', likeRoute);
app.use('/api/recommendation', recommendationRoute);
app.use('/api/message', messageRoutes);
app.use('/api/partner', partnerRoute);
app.use("/api/report", reportRouter);
app.use('/api/user', reportRouter);
app.use('/api/master', materRoute);
app.use('/api/match', matchesRoute);
app.use('/api/profile', profileRouter);
app.use('/api/profile/view', profileViewRouter);
app.use('/api/cross', blockRouter);
app.use('/api/similar', similarRouter);
app.use('/api/banners', bannerRouter);
app.use('/api/mutual-matches', mutualRouter);
app.use('/admin', adminRoute);
app.use("/uploads", express.static("uploads"));

// Save Expo Token (exactly as before)
app.post("/save-expo-token", async (req, res) => {
  const { userId, expoToken } = req.body;
  await RegisterModel.findByIdAndUpdate(userId, { expoToken });
  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Matrimonial Backend Running Successfully 🚀",
    version: "1.0.0",
  });
});

export default app;