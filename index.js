import express from 'express';
import cors from 'cors';

const app = express();

// Enable CORS for HTTP endpoints
app.use(cors({
  origin: process.env.CLIENT_URLS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://matro-m6d5.vercel.app', // your frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// Your routes
app.use('/auth', authRouter);

export default app;
