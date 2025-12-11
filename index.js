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
      ''
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 3) Attach io globally (so controllers can emit)
app.set('io', io);

// 4) Attach socket handlers
socketHandler(io);

// 5) Handle errors gracefully
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

// 6) Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
