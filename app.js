import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import RegisterModel from "./src/modal/register.js";

// Routes imports
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
import notificationRouter from "./src/router/notificationRoutes.js";

const app = express();

// ==================== SECURITY MIDDLEWARES ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URLS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://matrimonial-lq33.vercel.app',
    'https://matrimonial-backend-7ahc.onrender.com',
    'https://matro-main-ev8s.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// ==================== PERFORMANCE MIDDLEWARES ====================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== LOGGING ====================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==================== ROUTES ====================
app.use('/auth', authRoute);
app.use('/api/basic-details', additionalDetail);
app.use('/api/notification', notificationRouter);
app.use('/api/request', accountRouter);
app.use('/api/like', likeRoute);
app.use('/api/recommendation', recommendationRoute);
app.use('/api/message', messageRoutes);
app.use('/api/partner', partnerRoute);
app.use('/api/report', reportRouter);
app.use('/api/master', materRoute);
app.use('/api/match', matchesRoute);
app.use('/api/profile', profileRouter);
app.use('/api/profile/view', profileViewRouter);
app.use('/api/cross', blockRouter);
app.use('/api/similar', similarRouter);
app.use('/api/banners', bannerRouter);
app.use('/api/mutual-matches', mutualRouter);
app.use('/admin', adminRoute);

// Static files
app.use("/uploads", express.static("uploads"));

// ==================== UTILITY ENDPOINTS ====================
// Save Expo Token (Mobile Push)
app.post("/save-expo-token", async (req, res) => {
  try {
    const { userId, expoToken } = req.body;
    
    if (!userId || !expoToken) {
      return res.status(400).json({
        success: false,
        message: "userId and expoToken are required"
      });
    }

    await RegisterModel.findByIdAndUpdate(userId, { 
      $set: { expoToken } 
    });

    res.json({ 
      success: true,
      message: "Expo token saved successfully" 
    });
  } catch (error) {
    console.error("Error saving Expo token:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// ==================== HEALTH & INFO ENDPOINTS ====================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Matrimonial Backend Running Successfully 🚀",
    version: "1.0.0",
    documentation: "/api-docs", // Consider adding Swagger/OpenAPI
    endpoints: {
      auth: "/auth",
      messages: "/api/message",
      profiles: "/api/profile",
      notifications: "/api/notification",
      matches: "/api/match",
      admin: "/admin"
    }
  });
});

// API Documentation (you can add Swagger later)
app.get("/api-docs", (req, res) => {
  res.json({
    message: "API Documentation",
    note: "Add Swagger/OpenAPI documentation here"
  });
});

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;