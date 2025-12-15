import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './src/config/db.js';
import { socketHandler } from './socket.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// 1) Connect DB
connectDB();

// 2) HTTP + Socket server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://matrimonial-lq33.vercel.app',
      'https://matrimonial-backend-7ahc.onrender.com',
      'https://matro-main-ev8s.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  }
});

// 3) Attach io globally (so controllers can emit)
app.set('io', io);
global.io = io; // Also set globally for utility functions

// 4) Attach socket handlers
socketHandler(io);

// 5) Handle errors gracefully
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});

// 6) Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 7) Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, closing server...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 8) Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Server Information:
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  URL: http://localhost:${PORT}
  Time: ${new Date().toLocaleString()}
  
🔗 WebSocket: ws://localhost:${PORT}
📡 Socket.IO Ready
  `);
});

// 9) Health check endpoint (for load balancers)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});