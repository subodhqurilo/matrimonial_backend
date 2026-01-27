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

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://matro-main4444-4wza.vercel.app',
      'https://matro-br.vercel.app',
      'https://matro-main4444-ajhw.vercel.app',
      'https://matrimonial-backend-7ahc.onrender.com',
      'https://matro-main-ev8s.vercel.app',
      'https://matro-main4444-bgn8.vercel.app',
      'https://matrimonial-lq33.vercel.app',
      'https://matro-main4444-oypd.vercel.app',
      'https://matro-main4444-swb3.vercel.app',
      'https://matrimonial-ency.vercel.app'

    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8, // 100MB for file uploads
});

// 3) Attach io globally (so controllers can emit)
app.set('io', io);
global.io = io; // Make io available globally for utility functions

// 4) Attach socket handlers
socketHandler(io);

// 5) Monitor socket connections
let connectionCount = 0;
io.engine.on("connection", (socket) => {
  connectionCount++;
  console.log(`📡 Total connections: ${connectionCount}`);
  
  socket.on("close", () => {
    connectionCount--;
    console.log(`📡 Total connections: ${connectionCount}`);
  });
});

// 6) Socket.IO error handling
io.engine.on("connection_error", (err) => {
  console.error('❌ Socket.IO connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

// 7) Handle errors gracefully
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
});

// 8) Handle process signals
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  // Close all Socket.IO connections
  io.close();
  console.log('✅ Socket.IO server closed');
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 9) Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// 10) Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Server Information:
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  URL: http://localhost:${PORT}
  Time: ${new Date().toLocaleString()}
  
📡 Socket.IO Configuration:
  CORS Origins: ${process.env.CLIENT_URLS || 'Default'}
  Transports: websocket, polling
  Connection Recovery: Enabled
  
🔗 WebSocket: ws://localhost:${PORT}/socket.io/?EIO=4&transport=websocket
  `);
});

// 11) Health check endpoint (for load balancers)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'matrimonial-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: connectionCount,
    environment: process.env.NODE_ENV || 'development',
  });
});

// 12) Socket.IO status endpoint
app.get('/socket-status', (req, res) => {
  const sockets = Array.from(io.sockets.sockets.values());
  const users = new Set(sockets.map(socket => socket.userId).filter(Boolean));
  
  res.status(200).json({
    totalConnections: connectionCount,
    authenticatedUsers: users.size,
    connectedSockets: sockets.length,
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
  });
});
