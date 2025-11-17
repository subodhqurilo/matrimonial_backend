import express from 'express';
import { createMatch, getAllMatches } from '../controller/matchController.js';
import upload from '../middlewares/multer.js';
 

const matchesRoute = express.Router();

matchesRoute.post('/add', upload.fields([
  { name: 'image', maxCount: 1 },
]), createMatch);
matchesRoute.get('/all', getAllMatches);

export default matchesRoute;
