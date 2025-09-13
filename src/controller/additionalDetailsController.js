import RegisterModel from "../modal/register.js";
import express from 'express';
import cloudinary from '../utils/cloudinary.js'; 
import fs from 'fs';

export const updateAdditionalDetails = async (req, res) => {
  try {
    const userId = req.userId; // comes from auth middleware
    const updates = req.body;

    // Optional: Validate allowed fields here if needed

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...updates,
        //  horoscope: updates.horoscope || {},
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Additional details updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('[Update Additional Details]', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong while updating additional details',
      error: error.message
    });
  }
};


export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await RegisterModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('[Get User By ID Error]', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};




export const updateProfileImagesOnly = async (req, res) => {
  try {
    const userId = req.userId;
    const file = req.files?.['profileImage']?.[0];

    if (!file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Multer CloudinaryStorage already gives secure URL in file.path
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { profileImage: file.path },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: { profileImage: updatedUser.profileImage }
    });
  } catch (error) {
    console.error('[Image Update Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};




