import RegisterModel from "../modal/register.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import NotificationModel from "../modal/Notification.js";
import { sendExpoPush } from "../utils/expoPush.js"; // expo push function



export const updateAdditionalDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const body = req.body;

    // ---------------------- ALLOWED FIELDS ONLY ----------------------
    const allowedFields = [
      "diet",
      "drinking",
      "smoking",
      "openToPets",
      "ownHouse",
      "ownCar",
      "foodICook",
      "hobbies",
      "interests",
      "favoriteMusic",
      "sports",
      "cuisine",
      "movies",
      "tvShows",
      "vacationDestination",
      "healthInformation",
      "anyDisability",
      "horoscope"
    ];

    const finalUpdates = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        finalUpdates[key] = body[key];
      }
    }

    // ---------------------- SAFE HOROSCOPE MERGE ----------------------
    if (body.horoscope) {
      finalUpdates.horoscope = {
        ...body.horoscope
      };
    }

    // ---------------------- UPDATE ----------------------
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { $set: finalUpdates },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /* =====================================================
       🔴 SOCKET NOTIFICATION → ONLY SAME USER
    ===================================================== */

    const io = req.app.get("io");

    if (io) {
      io.to(String(userId)).emit("newNotification", {
        title: "Profile Updated",
        message: "Your additional details have been updated.",
        type: "additional_details_update",
        userId,
        createdAt: new Date(),
      });
    }

    /* =====================================================
       ⚠ RESPONSE — EXACT SAME (NO CHANGE)
    ===================================================== */
    return res.status(200).json({
      success: true,
      message: "Additional details updated successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("❌ [Update Additional Details]", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating additional details",
      error: error.message
    });
  }
};




export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    let user = null;

    // 1️⃣ If userId is a valid Mongo ObjectId → Search by _id
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await RegisterModel.findById(userId);
    }

    // 2️⃣ If not found → Try matching custom "id" (vmXXXXX)
    if (!user) {
      user = await RegisterModel.findOne({ id: userId });
    }

    // 3️⃣ If still not found → return error
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error("[Get User By ID Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};





export const updateProfileImagesOnly = async (req, res) => {
  try {
    const userId = req.userId;

    // ---------------------- GET IMAGE FROM MULTER ----------------------
    const profileImage = req.files?.profileImage?.[0]?.path;

    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: "No profile image uploaded",
      });
    }

    // ---------------------- VALIDATE FILE TYPE ----------------------
    const allowedFormats = ["jpg", "jpeg", "png", "webp"];
    const extension = profileImage.split(".").pop().toLowerCase();

    if (!allowedFormats.includes(extension)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Allowed: jpg, jpeg, png, webp",
      });
    }

    // ---------------------- GET USER ----------------------
    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ---------------------- DELETE OLD CLOUDINARY IMAGE ----------------------
    if (user.profileImage) {
      try {
        const publicId = user.profileImage.split("/").pop().split(".")[0];
        await cloudinary.v2.uploader.destroy(`register_profiles/${publicId}`);
      } catch (err) {
        console.warn("Old image delete failed (not critical):", err.message);
      }
    }

    // ---------------------- UPDATE DATABASE ----------------------
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("[Profile Image Update Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.userId;

    // ---------------------- GET USER ----------------------
    const user = await RegisterModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ---------------------- NO IMAGE EXISTS ----------------------
    if (!user.profileImage) {
      return res.status(400).json({
        success: false,
        message: "No profile image found to delete",
      });
    }

    // ---------------------- EXTRACT PUBLIC ID FROM URL ----------------------
    const urlParts = user.profileImage.split("/");
    const filename = urlParts[urlParts.length - 1]; // last part
    const publicId = filename.split(".")[0]; // remove extension

    // ---------------------- DELETE FROM CLOUDINARY ----------------------
    try {
      await cloudinary.v2.uploader.destroy(`register_profiles/${publicId}`);
    } catch (err) {
      console.warn("Cloudinary delete failed:", err.message);
      // Not critical: still remove from DB
    }

    // ---------------------- UPDATE DB (SET NULL / DEFAULT IMAGE) ----------------------
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { profileImage: null },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile image deleted successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("[Delete Profile Image Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const uploadGalleryImages = async (req, res) => {
  try {
    const userId = req.userId;

    const files = req.files?.galleryImages;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    const imagePaths = files.map((file) => file.path);

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { $push: { galleryImages: { $each: imagePaths } } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Images uploaded successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Upload Gallery Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const deleteGalleryImage = async (req, res) => {
  try {
    const userId = req.userId;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required"
      });
    }

    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if image exists
    if (!user.galleryImages.includes(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: "Image not found in gallery"
      });
    }

    // Delete from Cloudinary
    try {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.v2.uploader.destroy(`gallery/${publicId}`);
    } catch (err) {
      console.warn("Cloudinary delete failed:", err.message);
    }

    // Remove from array
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { $pull: { galleryImages: imageUrl } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Delete Gallery Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const replaceGalleryImages = async (req, res) => {
  try {
    const userId = req.userId;

    const files = req.files?.galleryImages;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    const user = await RegisterModel.findById(userId);

    // Delete old images from cloudinary
    for (const img of user.galleryImages) {
      try {
        const publicId = img.split("/").pop().split(".")[0];
        await cloudinary.v2.uploader.destroy(`gallery/${publicId}`);
      } catch (err) {
        console.warn("Failed to delete old image:", err.message);
      }
    }

    const newImages = files.map((f) => f.path);

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { galleryImages: newImages },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Gallery updated successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Replace Gallery Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
