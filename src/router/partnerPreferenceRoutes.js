import express from 'express';
import { createOrUpdatePartnerPreference, getPartnerPreference, getSearchUserById, searchUsers } from '../controller/partnerPreferenceController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
 

const partnerRoute = express.Router();

partnerRoute.post('/preference',authenticateUser, createOrUpdatePartnerPreference);
partnerRoute.get('/preference/:userId',authenticateUser, getPartnerPreference);
partnerRoute.get('/search',authenticateUser, searchUsers);
partnerRoute.get('/searchById/:id',authenticateUser, getSearchUserById);

export default partnerRoute;
