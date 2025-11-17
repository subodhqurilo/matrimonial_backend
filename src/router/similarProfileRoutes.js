// routes/similarProfileRoutes.js

import express from 'express';
import { getSimilarProfiles } from '../controller/getSimilarProfiles.js';


const similarRouter = express.Router();

similarRouter.get('/profiles', getSimilarProfiles);

export default similarRouter;
