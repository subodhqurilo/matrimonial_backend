import Notification from "../models/Notification.js";
import RegisterModel from "../modal/register.js";
import { sendExpoPush } from "../util/expoPush.js";

export const sendNotification = async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    const saved = await Notification.create({
      user: userId,
      title,
      message,
      read: false,
    });

    const io = req.app.get("io");

    io.to(String(userId)).emit("newNotification", saved);

    const user = await RegisterModel.findById(userId);
    if (user?.expoToken) {
      await sendExpoPush(user.expoToken, title, message);
    }

    return res.json({ success: true, data: saved });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
