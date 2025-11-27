import express from "express";
import {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controller/notificationController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ---------------------------------------------
   SEND NOTIFICATION TO LOGGED-IN USER
---------------------------------------------- */
router.post("/send", authenticateUser, sendNotification);

/* ---------------------------------------------
   GET LOGGED-IN USER NOTIFICATIONS
---------------------------------------------- */
router.get("/me", authenticateUser, getNotifications);

/* ---------------------------------------------
   MARK SINGLE NOTIFICATION AS READ
---------------------------------------------- */
router.patch("/mark-read/:notificationId", authenticateUser, markAsRead);

/* ---------------------------------------------
   MARK ALL NOTIFICATIONS AS READ
---------------------------------------------- */
router.patch("/mark-all", authenticateUser, markAllAsRead);

/* ---------------------------------------------
   DELETE SINGLE NOTIFICATION
---------------------------------------------- */
router.delete("/:notificationId", authenticateUser, deleteNotification);

/* ---------------------------------------------
   DELETE ALL NOTIFICATIONS
---------------------------------------------- */
router.delete("/all", authenticateUser, deleteAllNotifications);

export default router;
