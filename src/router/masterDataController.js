import express from 'express';
import {
  profileFor,
  maritalStatus,
  religion,
  caste,
  communities,
  diet,
  color,
  motherTongue,
  familyStatus,
  state,
  city,
  education,
  employedIn,
  designation,
  getAllField,
  getCitiesByState
} from '../controller/masterDataController.js';

const masterRoute = express.Router();

const registerRoutes = (path, controller) => {
  masterRoute.post(path, controller.add);
  masterRoute.get(path, controller.get);
  masterRoute.put(`${path}/:id`, controller.update);
  masterRoute.delete(`${path}/:id`, controller.delete);
};

// Master Data CRUD Routes
registerRoutes('/profile-for', profileFor);
registerRoutes('/marital-status', maritalStatus);
registerRoutes('/religion', religion);
registerRoutes('/caste', caste);
registerRoutes('/communities', communities);
registerRoutes('/diet', diet);
registerRoutes('/color', color);
registerRoutes('/mother-tongue', motherTongue);
registerRoutes('/family-status', familyStatus);
registerRoutes('/state', state);
registerRoutes('/city', city);
registerRoutes('/education', education);
registerRoutes('/employed-in', employedIn);
registerRoutes('/designation', designation);

// Get all dropdown fields
masterRoute.get('/dropdown', getAllField);

// Get cities by state name (query param: ?state=StateName)
masterRoute.get('/cities-by-state', getCitiesByState);

export default masterRoute;
