import Notification from "../modal/Notification.js";
import RegisterModel from "../modal/register.js";
import { sendExpoPush } from "../utils/expoPush.js";

/**
 * 1) SEND NEW NOTIFICATION (Logged-in User)
 */
export const sendNotification = async (req, res) => {
  try {
    const userId = req.userId;      // logged-in user
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const saved = await Notification.create({
      user: userId,
      title,
      message,
      read: false,
    });

    // SOCKET Real-time Notification
    const io = req.app.get("io");
    io.to(String(userId)).emit("newNotification", saved);

    // Expo Push Notification
    const user = await RegisterModel.findById(userId);
    if (user?.expoToken) {
      await sendExpoPush(user.expoToken, title, message);
    }

    return res.json({ success: true, data: saved });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * 2) GET ALL NOTIFICATIONS (Logged-in User Only)
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: notifications });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * 3) MARK A SINGLE NOTIFICATION AS READ
 */
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({ success: true, message: "Marked as read" });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * 4) MARK ALL NOTIFICATIONS AS READ
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );

    return res.json({ success: true, message: "All notifications marked as read" });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * 5) DELETE SINGLE NOTIFICATION
 */
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    return res.json({ success: true, message: "Notification deleted" });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * 6) DELETE ALL NOTIFICATIONS (Logged-in User)
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.deleteMany({ user: userId });

    return res.json({ success: true, message: "All notifications deleted" });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
