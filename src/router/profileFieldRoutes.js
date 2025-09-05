// routes/profileFieldRoutes.js
import express from "express";
import {
  addOptionToField,
  getAllFields,
  deleteOption,
} from "../controllers/profileFieldController.js";

const profileFieldRoute = express.Router();

profileFieldRoute.post("/add-option", addOptionToField);
profileFieldRoute.get("/", getAllFields);
profileFieldRoute.post("/delete-option", deleteOption);

export default profileFieldRoute;
