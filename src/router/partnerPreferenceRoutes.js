import express from 'express';
import { createOrUpdatePartnerPreference, getPartnerPreference,getMatchedUsersByPreference, getSearchUserById, searchUsers } from '../controller/partnerPreferenceController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';
 

const partnerRoute = express.Router();

partnerRoute.post('/preference',authenticateUser, createOrUpdatePartnerPreference);
partnerRoute.get('/preference/:userId',authenticateUser, getPartnerPreference);
partnerRoute.post('/search', authenticateUser, searchUsers);
partnerRoute.get('/searchById/:id',authenticateUser, getSearchUserById);
partnerRoute.get('/match', authenticateUser, getMatchedUsersByPreference);


export default partnerRoute;
